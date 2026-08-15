import type {ChannelId, VoiceProfile} from './channels/types';
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
  /** Optional override for an automatically generated YouTube chapter title. */
  chapterTitle?: string;
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

export type CountingScene = Base & {
  type: 'counting';
  kicker?: string;
  /** The numeral and the quantity of countable dots shown on screen. */
  number: number;
  /** Written form, for example "Seven". */
  word: string;
  prompt?: string;
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
  rank?: number;
};

export type FlashcardsScene = Base & {
  type: 'flashcards';
  kicker?: string;
  title?: string;
  items: FlashcardItem[];
  prompt?: string;
  showCluesInCompact?: boolean;
};

export type ChartBar = {
  label: string;
  value: number;
  /** Overrides the scene hue for this bar only. Prefer highlightIndex. */
  accent?: Accent;
};

export type ChartScene = Base & {
  type: 'chart';
  kicker?: string;
  title?: string;
  /**
   * Bars share one hue (the scene accent) because they encode magnitude, not
   * identity — identity lives in the label under each bar. Use highlightIndex
   * to spotlight one bar and mute the rest.
   */
  bars: ChartBar[];
  /** Rendered after each value, e.g. "%", "ms", "×". */
  unit?: string;
  highlightIndex?: number;
  footnote?: string;
};

export type TimelineEvent = {
  /** Marker caption, e.g. a year, version, or step time. */
  time: string;
  label: string;
  detail?: string;
  accent?: Accent;
};

export type TimelineScene = Base & {
  type: 'timeline';
  kicker?: string;
  title?: string;
  events: TimelineEvent[];
};

export type KineticBeat = {
  text: string;
  accent?: Accent;
  /**
   * Frames this beat holds the screen. Beats without an explicit hold split
   * the remaining scene time evenly.
   */
  holdFrames?: number;
};

export type KineticTextScene = Base & {
  type: 'kineticText';
  /** Short punchy phrases shown one after another, filling the frame. */
  beats: KineticBeat[];
};

/** Any picture or footage shown on screen must carry its provenance. */
export type LicensedVisualAsset = {
  /** Path relative to public/. */
  src: string;
  /** Human-readable creator or library attribution. */
  credit: string;
  /** License identifier or "original" for project-owned media. */
  license: string;
  sourceUrl?: string;
};

export type ImageScene = Base & {
  type: 'image';
  kicker?: string;
  title?: string;
  image: LicensedVisualAsset & {
    /** cover fills the frame; contain letterboxes. Defaults to cover. */
    fit?: 'cover' | 'contain';
    /** Slow push-in so stills feel alive. Defaults on for cover fit. */
    kenBurns?: boolean;
  };
  caption?: string;
  /** Hide the automatic on-frame credit line (credit still ships in metadata). */
  hideCredit?: boolean;
};

export type VideoClipScene = Base & {
  type: 'videoClip';
  kicker?: string;
  title?: string;
  clip: LicensedVisualAsset & {
    fit?: 'cover' | 'contain';
    /** Frames to skip at the start of the source file. */
    trimBefore?: number;
    /** Clip audio is muted by default; narration owns the mix. */
    muted?: boolean;
    volume?: number;
  };
  caption?: string;
  hideCredit?: boolean;
};

export type CountdownScene = Base & {
  type: 'countdown';
  kicker?: string;
  /** Counts down from this number to 1. Keep it between 2 and 10. */
  from: number;
  /** Shown when the countdown lands. */
  reveal: string;
  revealEmoji?: string;
  /**
   * Frames reserved for the reveal. Defaults to 40% of the scene; the
   * numbers split the rest evenly.
   */
  revealFrames?: number;
};

export type NumberLineMark = {
  value: number;
  label?: string;
  accent?: Accent;
};

export type NumberLineScene = Base & {
  type: 'numberLine';
  kicker?: string;
  title?: string;
  min: number;
  max: number;
  /** Tick spacing. Defaults to 1. */
  step?: number;
  /** Values marked on the line, revealed in order. */
  marks: NumberLineMark[];
  /** An animated hop, e.g. from 3 to 5 to show adding two. */
  jump?: {from: number; to: number; accent?: Accent};
};

export type DiagramLabel = {
  text: string;
  detail?: string;
  /** Which side of the illustration the label sits on. */
  side: 'left' | 'right';
  emoji?: string;
  accent?: Accent;
};

export type LabeledDiagramScene = Base & {
  type: 'labeledDiagram';
  kicker?: string;
  title?: string;
  /** The illustration: one large emoji (or a short emoji cluster). */
  emoji: string;
  labels: DiagramLabel[];
  prompt?: string;
};

export type QuizOption = {
  label: string;
  emoji?: string;
};

export type QuizScene = Base & {
  type: 'quiz';
  kicker?: string;
  question: string;
  /** Two to four choices. */
  options: QuizOption[];
  /** Index into options of the correct answer. */
  answerIndex: number;
  /** One line shown with the reveal, e.g. the reason the answer is right. */
  explanation?: string;
  /**
   * Frame at which the answer is revealed. Defaults to 60% of the scene so
   * viewers get a thinking pause. Validation enforces a minimum pause.
   */
  revealAtFrame?: number;
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

export type MotionCanvasPosition = {
  /** Horizontal position as a percentage of the safe canvas. */
  x: number;
  /** Vertical position as a percentage of the safe canvas. */
  y: number;
};

export type MotionCanvasElement =
  | (MotionCanvasPosition & {
      id: string;
      kind: 'text';
      text: string;
      role?: 'headline' | 'label' | 'payoff' | 'cta';
      width?: number;
    })
  | (MotionCanvasPosition & {
      id: string;
      kind: 'search';
      query: string;
      width?: number;
      typewriter?: boolean;
    })
  | (MotionCanvasPosition & {
      id: string;
      kind: 'code';
      code: string;
      label?: string;
      width?: number;
      typewriter?: boolean;
      /** Show a stable gutter so runtime actions can point at exact lines. */
      lineNumbers?: boolean;
    })
  | (MotionCanvasPosition & {
      id: string;
      kind: 'dot';
      label: string;
      size?: number;
      tone?: 'accent' | 'positive' | 'negative' | 'neutral';
    })
  | (MotionCanvasPosition & {
      id: string;
      kind: 'cluster';
      label: string;
      width?: number;
      height?: number;
    })
  | (MotionCanvasPosition & {
      id: string;
      kind: 'shape';
      /** Semantic geometry keeps diagrams from becoming collections of circles. */
      shape:
        | 'circle'
        | 'square'
        | 'rounded-square'
        | 'diamond'
        | 'triangle'
        | 'hexagon'
        | 'pill'
        | 'ring'
        | 'database'
        | 'document';
      label?: string;
      sublabel?: string;
      width?: number;
      height?: number;
      tone?: 'accent' | 'positive' | 'negative' | 'neutral';
      /** Deterministic, frame-derived idle choreography. */
      animation?: 'none' | 'float' | 'rotate' | 'wobble' | 'breathe';
    })
  | {
      id: string;
      kind: 'connector';
      from: string;
      to: string;
      label?: string;
      dashed?: boolean;
      arrow?: boolean;
    }
  | (MotionCanvasPosition & {
      id: string;
      kind: 'mascot';
      expression: 'curious' | 'surprised' | 'thinking' | 'happy';
      label?: string;
    })
  | (MotionCanvasPosition & {
      id: string;
      kind: 'image';
      /** Public-relative path beneath images/ or generated/. */
      src: string;
      /** Short description used by the editor and browser preview. */
      alt: string;
      /** Width and height as percentages of the safe motion canvas. */
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain';
      radius?: number;
      caption?: string;
      credit?: string;
      /** Finite, seek-safe motion applied inside the image frame. */
      motion?:
        | 'none'
        | 'ken-burns-in'
        | 'ken-burns-out'
        | 'pan-left'
        | 'pan-right';
      /** Focal point percentages used by object-position. */
      focalX?: number;
      focalY?: number;
    });

export type MotionCanvasAction = {
  target: string;
  type:
    | 'reveal'
    | 'draw'
    | 'highlight'
    | 'hide'
    | 'pulse'
    | 'travel'
    | 'spin'
    | 'bounce'
    | 'focus-line'
    | 'execute-line';
  /** One-based line used by focus-line and execute-line actions. */
  line?: number;
  /** Concise explanation displayed beside the active code line. */
  note?: string;
  /** Runtime value or terminal result produced by this line. */
  output?: string;
  /** Scene-relative preview fallback used before narration timings exist. */
  atFrame: number;
  durationFrames?: number;
  /**
   * Repositions this action from the generated narration timing file. The
   * fallback frame remains deterministic when voice has not been generated.
   */
  anchor?: {
    phrase: string;
    occurrence?: number;
    offsetFrames?: number;
  };
};

export type MotionCanvasScene = Base & {
  type: 'motionCanvas';
  /** Complete art-direction preset for the canvas, panels, type, and connectors. */
  style: 'whiteboard-light' | 'midnight-code' | 'electric-grid';
  motion?: {
    intensity: 'calm' | 'dynamic';
    ambient?: boolean;
  };
  /** Seek-safe effects. Every value is derived from the current Remotion frame. */
  effects?: {
    camera?: 'none' | 'push-in' | 'drift';
    particles?: 'none' | 'data-stream';
    glow?: 'none' | 'soft' | 'strong';
    scanlines?: boolean;
    vignette?: boolean;
  };
  headline?: string;
  /** End of the opening hook inside a continuous motion canvas. */
  hookEndFrame?: number;
  elements: MotionCanvasElement[];
  actions: MotionCanvasAction[];
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
  | CountingScene
  | ColorsScene
  | FlashcardsScene
  | QuizScene
  | ChartScene
  | TimelineScene
  | KineticTextScene
  | ImageScene
  | VideoClipScene
  | CountdownScene
  | NumberLineScene
  | LabeledDiagramScene
  | CalloutScene
  | ArrayVizScene
  | MotionCanvasScene
  | OutroScene;

export type SceneType = Scene['type'];

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
