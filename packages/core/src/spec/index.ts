import type {ChannelId, VoiceProfile} from '../channels/types';
import type {DeliveryId} from '../publishing/types';
import type {OutputVariantId} from '../output/types';
import type {Accent} from '../themes/types';

/**
 * A video in this kit is data, not a React tree.
 *
 * You describe scenes as plain objects; the renderer maps them onto components.
 * That keeps every video visually consistent for free, makes captions and VO
 * scripts derivable from the same source, and means a new video is one small
 * file rather than a new app. If a video needs something no scene type covers,
 * add a scene type — do not hand-roll JSX inside a video spec.
 */

/**
 * Scene shapes are defined once, as zod schemas in ./scenes, and the types here
 * are inferred from them. They used to be hand-written beside a separate loose
 * schema that validated three of the twenty-eight types, so a spec could be
 * saved with a body the renderer then crashed on.
 */
export {
  SCENE_SCHEMAS,
  SCENE_TYPES,
  SceneSchema,
  SceneTypeSchema,
} from './scenes';
export type {
  AlgorithmScene,
  AlgorithmStep,
  ArchEdge,
  ArchNode,
  ArchitectureScene,
  ArrayVizScene,
  BigStatScene,
  CalloutScene,
  ChartBar,
  ChartScene,
  CodeScene,
  ColorSwatch,
  ColorsScene,
  CompareScene,
  CountdownScene,
  CountingScene,
  DiagramLabel,
  FlashcardItem,
  FlashcardsScene,
  FlowScene,
  ImageScene,
  KineticBeat,
  KineticTextScene,
  LabeledDiagramScene,
  LicensedVisualAsset,
  MeterScene,
  MotionCanvasAction,
  MotionCanvasElement,
  MotionCanvasPosition,
  MotionCanvasScene,
  NumberLineMark,
  NumberLineScene,
  OutroScene,
  QuizOption,
  QuizScene,
  Scene,
  SceneOfType,
  SceneType,
  StatsScene,
  StepsScene,
  TerminalScene,
  TimelineEvent,
  TimelineScene,
  TitleScene,
  TokenItem,
  TokensScene,
  VideoClipScene,
} from './scenes';
export {AccentSchema, baseSceneFields} from './base';
export {ManagedImagePathSchema} from './assets';
export {
  MotionCanvasActionSchema,
  MotionCanvasElementSchema,
} from './scenes/motion-canvas';

import type {Scene} from './scenes';

/** A scene's shared fields, for code that works across scene types. */
export type Base = Pick<
  Scene,
  'id' | 'durationInFrames' | 'narration' | 'chapterTitle' | 'accent' | 'railStage'
>;


// ------------------------------------------------------------------ audio mix

export type LicensedAudioAsset = {
  /** Path relative to public/. */
  src: string;
  /** Human-readable creator or library attribution. */
  credit: string;
  /** License identifier or "original" for project-owned audio. */
  license: string;
  sourceUrl?: string;
  /** Linear gain. 0 is silent and 1 is the source level. */
  volume?: number;
};

export type MusicTrack = LicensedAudioAsset & {
  startFrame?: number;
  trimBefore?: number;
  loop?: boolean;
  fadeInFrames?: number;
  fadeOutFrames?: number;
};

export type SoundEffectCue = LicensedAudioAsset & {
  startFrame: number;
  trimBefore?: number;
  durationInFrames?: number;
};

export type Soundtrack = {
  music?: MusicTrack;
  effects?: SoundEffectCue[];
  ducking?: {
    /** Music gain while narration is active. Defaults to 0.3. */
    gain?: number;
    attackFrames?: number;
    releaseFrames?: number;
  };
};

// ------------------------------------------------------------------ the video

export type VideoSpec = {
  /** Selects brand, audience defaults, theme, handles, and delivery defaults. */
  channel: ChannelId;
  /** URL-safe id. Becomes the composition id and the output filename. */
  slug: string;
  title: string;
  /** Content pattern used by the scaffold and editorial validation. */
  template: string;
  /** Keep visual references available in Studio but out of production renders. */
  kind?: 'video' | 'style-guide';
  /** One line for the YouTube description / carousel caption. */
  summary?: string;
  fps?: number;
  /** Platform packages to produce. Defaults come from the channel profile. */
  deliveries?: DeliveryId[];
  /**
   * Explicit output variants. Takes precedence over `deliveries`, which stays
   * supported as the vocabulary persisted in existing project revisions.
   */
  outputs?: OutputVariantId[];
  audience?: {
    ageBand?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
  };
  editorial?: {
    language?: string;
    objective?: string;
    sources?: {title: string; url?: string}[];
    safetyStatus?: 'draft' | 'reviewed' | 'approved';
  };
  /** Optional voiceover track placed in public/. */
  audio?: string;
  /** Override any channel-level local TTS defaults for this video. */
  voice?: Partial<VoiceProfile>;
  /** Word timing JSON generated beside the voice track, relative to public/. */
  captionTimings?: string;
  /** Licensed background music, sound effects, and narration ducking. */
  soundtrack?: Soundtrack;
  /** Burn narration into the frame as captions. On by default for Reels. */
  captions?: boolean;
  /**
   * A persistent stage pipeline rendered above every scene. Scenes advance it
   * with `railStage`; it turns a sequence of cuts into one visible journey.
   */
  rail?: {stages: string[]};
  scenes: Scene[];
};

export const totalFrames = (spec: VideoSpec) =>
  spec.scenes.reduce((n, s) => n + s.durationInFrames, 0);

/** Absolute start frame of each scene, for captions and cue sheets. */
export const sceneOffsets = (spec: VideoSpec) => {
  let at = 0;
  return spec.scenes.map((s, i) => {
    const start = at;
    at += s.durationInFrames;
    return {index: i, id: s.id ?? `s${i + 1}`, start, end: at, scene: s};
  });
};
