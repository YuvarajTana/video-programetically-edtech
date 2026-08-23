import type {
  MotionCanvasAction,
  Scene,
  Soundtrack,
  VideoSpec,
} from './spec';

export type TimedWord = {text: string; start: number; end: number};
export type TimedCue = {
  index: number;
  start: number;
  end: number;
  text: string;
  words: TimedWord[];
};
export type WordTimingFile = {
  schemaVersion: 1;
  durationSeconds: number;
  locale?: string;
  alignment?: string;
  cues: TimedCue[];
};

export type AudioMode = 'voiceover' | 'music-only' | 'silent';

export type MasterTimelineMotionCue = MotionCanvasAction & {
  sceneId: string;
  absoluteFrame: number;
};

export type MasterTimelineScene = {
  index: number;
  id: string;
  type: Scene['type'];
  startFrame: number;
  endFrame: number;
  startSeconds: number;
  endSeconds: number;
  narration: string | null;
  cueIndexes: number[];
  layers: {
    visuals: boolean;
    motion: boolean;
    captions: boolean;
  };
  actions: Array<MotionCanvasAction & {absoluteFrame: number}>;
};

export type MasterTimeline = {
  schemaVersion: 1;
  title: string;
  locale: string;
  fps: number;
  durationInFrames: number;
  durationSeconds: number;
  tracks: {
    visuals: Array<{
      sceneId: string;
      type: Scene['type'];
      startFrame: number;
      endFrame: number;
    }>;
    motion: MasterTimelineMotionCue[];
    captions: TimedCue[];
    audio: {
      mode: AudioMode;
      narration: string | null;
      music: Soundtrack['music'] | null;
      effects: NonNullable<Soundtrack['effects']>;
    };
  };
  scenes: MasterTimelineScene[];
};

const tokens = (value: string) =>
  value.toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) ?? [];

const findAnchor = (words: TimedWord[], action: MotionCanvasAction) => {
  if (!action.anchor) return null;
  const phrase = tokens(action.anchor.phrase);
  if (!phrase.length) return null;
  const normalizedWords = words.map((word) => tokens(word.text).join(''));
  let occurrence = 0;

  for (let index = 0; index <= normalizedWords.length - phrase.length; index++) {
    if (phrase.every((token, offset) => normalizedWords[index + offset] === token)) {
      occurrence++;
      if (occurrence === (action.anchor.occurrence ?? 1)) return words[index];
    }
  }
  return null;
};

/** Resolve narration phrase anchors before the spec reaches the renderer. */
export const resolveMotionCanvasTiming = (
  spec: VideoSpec,
  timings: WordTimingFile | null,
): VideoSpec => {
  if (!timings) return spec;
  const fps = spec.fps ?? 30;
  let sceneStartFrame = 0;
  let anyChanged = false;

  const scenes = spec.scenes.map((scene) => {
    const startFrame = sceneStartFrame;
    sceneStartFrame += scene.durationInFrames;
    if (scene.type !== 'motionCanvas') return scene;

    const sceneStart = startFrame / fps;
    const sceneEnd = sceneStartFrame / fps;
    const words = timings.cues
      .flatMap((cue) => cue.words)
      .filter((word) => word.start >= sceneStart - 0.001 && word.start < sceneEnd);
    let sceneChanged = false;
    const actions = scene.actions.map((action) => {
      const word = findAnchor(words, action);
      if (!word || !action.anchor) return action;
      const atFrame = Math.max(
        0,
        Math.min(
          scene.durationInFrames - 1,
          Math.round((word.start - sceneStart) * fps) +
            (action.anchor.offsetFrames ?? 0),
        ),
      );
      if (atFrame === action.atFrame) return action;
      sceneChanged = true;
      anyChanged = true;
      return {...action, atFrame};
    });
    return sceneChanged ? {...scene, actions} : scene;
  });

  return anyChanged ? {...spec, scenes} : spec;
};

const sentenceCuesFor = (spec: VideoSpec): TimedCue[] => {
  const fps = spec.fps ?? 30;
  let cursor = 0;
  return spec.scenes.flatMap((scene, sceneIndex) => {
    const start = cursor / fps;
    cursor += scene.durationInFrames;
    if (!scene.narration?.trim()) return [];
    return [{
      index: sceneIndex + 1,
      start,
      end: cursor / fps,
      text: scene.narration,
      words: [],
    }];
  });
};

/**
 * Build the render contract. The returned spec has motion anchors frozen to
 * frames; the timeline is saved as a reviewable production artifact.
 */
export const buildMasterTimeline = ({
  spec,
  timings = null,
  locale = 'en-US',
  audioMode,
}: {
  spec: VideoSpec;
  timings?: WordTimingFile | null;
  locale?: string;
  audioMode: AudioMode;
}): {spec: VideoSpec; timeline: MasterTimeline} => {
  const resolvedSpec = resolveMotionCanvasTiming(spec, timings);
  const fps = resolvedSpec.fps ?? 30;
  const cues = timings?.cues ?? sentenceCuesFor(resolvedSpec);
  let cursor = 0;
  const scenes: MasterTimelineScene[] = resolvedSpec.scenes.map((scene, index) => {
    const startFrame = cursor;
    cursor += scene.durationInFrames;
    const startSeconds = startFrame / fps;
    const endSeconds = cursor / fps;
    const cueIndexes = cues
      .filter((cue) => cue.start < endSeconds && cue.end > startSeconds)
      .map((cue) => cue.index);
    const actions =
      scene.type === 'motionCanvas'
        ? scene.actions.map((action) => ({
            ...action,
            absoluteFrame: startFrame + action.atFrame,
          }))
        : [];
    return {
      index: index + 1,
      id: scene.id ?? `scene-${index + 1}`,
      type: scene.type,
      startFrame,
      endFrame: cursor,
      startSeconds,
      endSeconds,
      narration: scene.narration ?? null,
      cueIndexes,
      layers: {
        visuals: true,
        motion: scene.type === 'motionCanvas' || actions.length > 0,
        captions: Boolean(scene.narration && resolvedSpec.captions !== false),
      },
      actions,
    };
  });

  const timeline: MasterTimeline = {
    schemaVersion: 1,
    title: resolvedSpec.title,
    locale,
    fps,
    durationInFrames: cursor,
    durationSeconds: cursor / fps,
    tracks: {
      visuals: scenes.map(({id, type, startFrame, endFrame}) => ({
        sceneId: id,
        type,
        startFrame,
        endFrame,
      })),
      motion: scenes.flatMap((scene) =>
        scene.actions.map((action) => ({sceneId: scene.id, ...action})),
      ),
      captions: cues,
      audio: {
        mode: audioMode,
        narration: resolvedSpec.audio ?? null,
        music: resolvedSpec.soundtrack?.music ?? null,
        effects: resolvedSpec.soundtrack?.effects ?? [],
      },
    },
    scenes,
  };

  return {spec: resolvedSpec, timeline};
};
