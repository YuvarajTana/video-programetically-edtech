import type {GeneratedScriptScene} from '@video-kit/core/contracts';
import type {Scene, SceneType} from '@video-kit/core/spec';

export const sceneLabel = (scene: Scene) => {
  if ('title' in scene && scene.title) return scene.title;
  if ('text' in scene && scene.text) return scene.text;
  if ('label' in scene && scene.label) return scene.label;
  if (scene.narration) return scene.narration;
  return scene.type;
};

export const sceneFromType = (
  type: SceneType,
  current: Scene,
  index: number,
): Scene => {
  const base = {
    id: current.id ?? `scene-${index + 1}`,
    durationInFrames: current.durationInFrames,
    narration: current.narration,
    accent: current.accent,
  };
  const text = current.narration || 'Add narration here.';
  const conciseText =
    text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
  switch (type) {
    case 'title':
      return {...base, type, title: text, subtitle: ''};
    case 'steps':
      return {...base, type, kicker: text, items: [{label: 'First idea'}, {label: 'Second idea'}]};
    case 'code':
      return {...base, type, title: text, lang: 'text', lines: ['Your example here']};
    case 'terminal':
      return {...base, type, title: text, entries: [{cmd: 'echo "Hello video"'}]};
    case 'architecture':
      return {
        ...base,
        type,
        title: text,
        nodes: [
          {id: 'a', label: 'Input', col: 1, row: 1},
          {id: 'b', label: 'Output', col: 2, row: 1},
        ],
        edges: [{from: 'a', to: 'b'}],
      };
    case 'flow':
      return {...base, type, title: text, steps: [{label: 'Start'}, {label: 'Finish'}]};
    case 'compare':
      return {
        ...base,
        type,
        title: text,
        left: {heading: 'Before', points: ['Starting point']},
        right: {heading: 'After', points: ['Result']},
      };
    case 'stats':
      return {...base, type, title: text, cards: [{label: 'Metric', value: '100'}]};
    case 'bigStat':
      return {...base, type, value: String(index + 1), label: text};
    case 'counting':
      return {...base, type, number: index + 1, word: text};
    case 'colors':
      return {
        ...base,
        type,
        title: text,
        items: [{name: 'Orange', hex: '#ff7043', emoji: '●'}],
      };
    case 'flashcards':
      return {...base, type, title: text, items: [{label: 'Card', emoji: '★'}]};
    case 'arrayViz':
      return {...base, type, title: text, algorithm: 'selection', values: [5, 3, 8, 1]};
    case 'motionCanvas':
      return {
        ...base,
        type,
        style: 'midnight-code',
        motion: {intensity: 'dynamic', ambient: true},
        effects: {
          camera: 'push-in',
          particles: 'data-stream',
          glow: 'soft',
          scanlines: true,
          vignette: true,
        },
        headline: conciseText,
        elements: [
          {
            id: 'headline',
            kind: 'text',
            x: 50,
            y: 11,
            width: 92,
            role: 'headline',
            text: conciseText,
          },
        ],
        actions: [{target: 'headline', type: 'reveal', atFrame: 0, durationFrames: 18}],
      };
    case 'outro':
      return {...base, type, tagline: text, cta: 'Keep creating'};
    case 'callout':
    default:
      return {...base, type: 'callout', text};
  }
};

export const sceneFromGeneratedPlan = (
  plan: GeneratedScriptScene,
  current: Scene,
  index: number,
): Scene => {
  const planned = sceneFromType(
    plan.sceneType,
    {...current, narration: plan.narration},
    index,
  );
  switch (planned.type) {
    case 'title':
      return {...planned, title: plan.onScreenText, subtitle: plan.purpose};
    case 'callout':
      return {...planned, text: plan.onScreenText};
    case 'code':
      return {
        ...planned,
        title: plan.onScreenText,
        lang: 'python',
        lines: plan.codeVisual
          ? plan.codeVisual.split('\n')
          : ['# Add the reviewed runnable example'],
      };
    case 'terminal':
      return {
        ...planned,
        title: plan.onScreenText,
        entries: plan.codeVisual
          ? plan.codeVisual.split('\n').filter(Boolean).map((cmd) => ({cmd}))
          : [{cmd: '# Add the reviewed command'}],
      };
    case 'flow':
      return {
        ...planned,
        title: plan.onScreenText,
        steps: (plan.visualLabels.length ? plan.visualLabels : ['Input', 'Result'])
          .map((label) => ({label})),
      };
    case 'steps':
      return {
        ...planned,
        kicker: plan.onScreenText,
        items: (plan.visualLabels.length ? plan.visualLabels : ['First', 'Then'])
          .map((label) => ({label})),
      };
    case 'architecture': {
      const labels = plan.visualLabels.length
        ? plan.visualLabels.slice(0, 4)
        : ['Input', 'Service', 'Output'];
      return {
        ...planned,
        title: plan.onScreenText,
        nodes: labels.map((label, labelIndex) => ({
          id: `node-${labelIndex + 1}`,
          label,
          col: labelIndex + 1,
          row: 1,
        })),
        edges: labels.slice(1).map((_, labelIndex) => ({
          from: `node-${labelIndex + 1}`,
          to: `node-${labelIndex + 2}`,
        })),
      };
    }
    case 'compare': {
      const labels = plan.visualLabels.length >= 4
        ? plan.visualLabels
        : ['Before', 'Repeated work', 'After', 'Shared behavior'];
      const middle = Math.ceil(labels.length / 2);
      return {
        ...planned,
        title: plan.onScreenText,
        left: {heading: labels[0], points: labels.slice(1, middle)},
        right: {heading: labels[middle], points: labels.slice(middle + 1)},
      };
    }
    case 'outro':
      return {...planned, tagline: plan.onScreenText};
    default:
      return 'title' in planned
        ? {...planned, title: plan.onScreenText}
        : planned;
  }
};
