import type {Scene} from './spec';
import type {
  EditableVideoSpec,
  TemplateDefinition,
} from './contracts';

export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'untitled-video';

export const splitScript = (script: string) =>
  script
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

type TimedNarrationScene = {
  durationInFrames: number;
  narration?: string;
};

const narrationWeight = (scene: TimedNarrationScene) => {
  const narration = scene.narration?.trim() ?? '';
  if (!narration) return Math.max(1, scene.durationInFrames / 30);
  const words = narration.match(/\S+/gu)?.length ?? 0;
  const shortPauses = narration.match(/[,;:]/gu)?.length ?? 0;
  const longPauses = narration.match(/[.!?]/gu)?.length ?? 0;
  return Math.max(1, words + shortPauses * 0.15 + longPauses * 0.35);
};

export const fitScenesToDuration = (
  scenes: TimedNarrationScene[],
  targetFrames: number,
) => {
  const minimumFrames = 15;
  const minimumTotal = scenes.length * minimumFrames;
  if (targetFrames < minimumTotal) {
    throw new Error(
      `The requested runtime is too short for ${scenes.length} scenes.`,
    );
  }
  const weights = scenes.map(narrationWeight);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const distributable = targetFrames - minimumTotal;
  const allocations = weights.map((weight, index) => {
    const exact = distributable * (weight / totalWeight);
    return {index, frames: Math.floor(exact), remainder: exact % 1};
  });
  let leftover =
    distributable -
    allocations.reduce((total, allocation) => total + allocation.frames, 0);
  for (const allocation of [...allocations].sort(
    (left, right) => right.remainder - left.remainder,
  )) {
    if (leftover <= 0) break;
    allocations[allocation.index].frames += 1;
    leftover -= 1;
  }
  scenes.forEach((scene, index) => {
    scene.durationInFrames = minimumFrames + allocations[index].frames;
  });
};

export const sceneNarrationWpm = (scene: TimedNarrationScene, fps = 30) => {
  const words = scene.narration?.trim().match(/\S+/gu)?.length ?? 0;
  const seconds = scene.durationInFrames / fps;
  return seconds > 0 ? words / (seconds / 60) : 0;
};

export const scenesExceedNarrationRate = (
  scenes: TimedNarrationScene[],
  maxWordsPerMinute: number,
  fps = 30,
) =>
  scenes.some(
    (scene) => scene.narration && sceneNarrationWpm(scene, fps) > maxWordsPerMinute,
  );

const sceneForSlot = (
  sceneType: Scene['type'],
  narration: string,
  durationInFrames: number,
  index: number,
  title: string,
  defaultProps: Record<string, unknown>,
): Scene => {
  const base = {
    ...defaultProps,
    id: `scene-${index + 1}`,
    durationInFrames,
    narration,
  };
  switch (sceneType) {
    case 'title':
      return {...base, type: 'title', title, subtitle: narration};
    case 'steps':
      return {
        kicker: 'Key idea',
        items: narration
          .split(/[.;]/)
          .filter(Boolean)
          .slice(0, 4)
          .map((label) => ({label: label.trim()})),
        ...base,
        type: 'steps',
      };
    case 'flow':
      return {
        title: narration,
        steps: ['Start', 'Understand', 'Apply'].map((label) => ({label})),
        ...base,
        type: 'flow',
      };
    case 'compare':
      return {
        title: narration,
        left: {heading: 'Before', points: ['The starting point']},
        right: {heading: 'After', points: ['The clearer result']},
        ...base,
        type: 'compare',
      };
    case 'code':
      return {
        title: narration,
        lang: 'python',
        filename: 'example.py',
        lines: ['# Add a runnable example here'],
        ...base,
        type: 'code',
      };
    case 'bigStat':
      return {...base, type: 'bigStat', value: String(index + 1), label: narration};
    case 'outro':
      return {...base, type: 'outro', tagline: narration, cta: 'Keep learning'};
    case 'callout':
    default:
      return {...base, type: 'callout', text: narration};
  }
};

export const createSpecFromScript = ({
  title,
  categoryId,
  template,
  locale,
  deliveries,
  script,
  targetSeconds,
}: {
  title: string;
  categoryId: string;
  template: TemplateDefinition;
  locale: string;
  deliveries: EditableVideoSpec['deliveries'];
  script: string;
  targetSeconds?: number;
}): EditableVideoSpec => {
  const paragraphs = splitScript(script);
  const content = paragraphs.length
    ? paragraphs
    : [`Welcome to ${title}.`, 'Add your narration here.', 'Thanks for watching.'];
  const repeatable =
    template.slots.find((slot) => slot.repeatable) ??
    template.slots.at(-1)!;
  const repeatableIndex = template.slots.indexOf(repeatable);
  const suffixSlots = template.slots.slice(repeatableIndex + 1);
  const scenes = content.map((narration, index) => {
    const suffixStart = Math.max(repeatableIndex + 1, content.length - suffixSlots.length);
    const slot =
      index < repeatableIndex
        ? template.slots[index]
        : index >= suffixStart
          ? suffixSlots[index - suffixStart] ?? repeatable
          : repeatable;
    return sceneForSlot(
      slot.sceneType,
      narration,
      Math.round(slot.durationSeconds * 30),
      index,
      title,
      slot.defaultProps,
    );
  });

  if (targetSeconds) {
    const targetFrames = Math.round(targetSeconds * 30);
    fitScenesToDuration(scenes, targetFrames);
  }

  return {
    channel: categoryId,
    slug: slugify(title),
    title,
    template: template.id,
    summary: content[0],
    fps: 30,
    deliveries,
    editorial: {language: locale},
    captions: true,
    scenes,
  } as EditableVideoSpec;
};
