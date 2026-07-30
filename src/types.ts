import type {ChannelId} from './channels/types';
import type {DeliveryId} from './publishing/types';
import type {Accent} from './themes/types';

/**
 * A video in this kit is data, not a React tree.
 *
 * You describe scenes as plain objects; the renderer maps them onto components.
 * That keeps every video visually consistent for free, makes captions and VO
 * scripts derivable from the same source, and means a new video is one small
 * file rather than a new app. If a video needs something no scene type covers,
 * add a scene type — do not hand-roll JSX inside a video spec.
 */

export type Base = {
  /** Stable id, used for caption cues and debugging. Defaults to the index. */
  id?: string;
  /** Length of the scene in frames. At 30fps, 30 frames = 1 second. */
  durationInFrames: number;
  /** Spoken/on-screen captionline. Drives the .srt and the VO script. */
  narration?: string;
  accent?: Accent;
};

// ---------------------------------------------------------------- scene types

export type TitleScene = Base & {
  type: 'title';
  kicker?: string;
  title: string;
  subtitle?: string;
};

export type StepsScene = Base & {
  type: 'steps';
  kicker?: string;
  items: {label: string; detail?: string; accent?: Accent}[];
  footnote?: string;
};

export type CodeScene = Base & {
  type: 'code';
  kicker?: string;
  title?: string;
  lang?: string;
  filename?: string;
  lines: string[];
  /** Line numbers (1-based) to spotlight, revealed in order over the scene. */
  focus?: {lines: number[]; note?: string}[];
};

export type TerminalScene = Base & {
  type: 'terminal';
  title?: string;
  host?: string;
  entries: {cmd?: string; out?: string[]; accent?: Accent}[];
};

export type ArchNode = {
  id: string;
  label: string;
  sub?: string;
  /** Grid position. Columns run left→right, rows top→bottom. */
  col: number;
  row: number;
  accent?: Accent;
  /** Spans this many grid columns. */
  span?: number;
};

export type ArchEdge = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
};

export type ArchitectureScene = Base & {
  type: 'architecture';
  title?: string;
  kicker?: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
  /** Node ids revealed together, group by group, before any packet travels. */
  reveal?: string[][];
  /** A packet animated along a path of node ids, to trace a request. */
  trace?: {path: string[]; label?: string; accent?: Accent};
};

export type FlowScene = Base & {
  type: 'flow';
  title?: string;
  kicker?: string;
  steps: {label: string; detail?: string; accent?: Accent}[];
};

export type CompareScene = Base & {
  type: 'compare';
  title?: string;
  kicker?: string;
  left: {heading: string; points: string[]; accent?: Accent};
  right: {heading: string; points: string[]; accent?: Accent};
};

export type StatsScene = Base & {
  type: 'stats';
  title?: string;
  kicker?: string;
  cards: {label: string; value: string; note?: string; accent?: Accent}[];
};

export type BigStatScene = Base & {
  type: 'bigStat';
  kicker?: string;
  value: string;
  label?: string;
  note?: string;
};

export type ColorSwatch = {
  name: string;
  hex: string;
  example?: string;
  emoji?: string;
};

export type ColorsScene = Base & {
  type: 'colors';
  kicker?: string;
  title?: string;
  items: ColorSwatch[];
  prompt?: string;
};

export type FlashcardItem = {
  label: string;
  emoji: string;
  clue?: string;
  color?: string;
};

export type FlashcardsScene = Base & {
  type: 'flashcards';
  kicker?: string;
  title?: string;
  items: FlashcardItem[];
  prompt?: string;
};

export type CalloutScene = Base & {
  type: 'callout';
  text: string;
  attribution?: string;
};

export type ArrayVizScene = Base & {
  type: 'arrayViz';
  title?: string;
  algorithm: 'selection' | 'bubble';
  values: number[];
  /** Frames per comparison / swap / lock. Tune to fit the scene duration. */
  tempo?: {compare: number; swap: number; lock: number};
};

export type OutroScene = Base & {
  type: 'outro';
  handle?: string;
  tagline?: string;
  cta?: string;
  /** Optional monospace summary block, e.g. the concept in three lines. */
  recap?: string[];
};

export type Scene =
  | TitleScene
  | StepsScene
  | CodeScene
  | TerminalScene
  | ArchitectureScene
  | FlowScene
  | CompareScene
  | StatsScene
  | BigStatScene
  | ColorsScene
  | FlashcardsScene
  | CalloutScene
  | ArrayVizScene
  | OutroScene;

export type SceneType = Scene['type'];

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
  /** Burn narration into the frame as captions. On by default for Reels. */
  captions?: boolean;
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
