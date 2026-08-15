import type {VideoSpec} from '../src/types';

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
      type: string;
      startFrame: number;
      endFrame: number;
    }>;
    motion: Array<{
      sceneId: string;
      target: string;
      type: string;
      atFrame: number;
      absoluteFrame: number;
      [key: string]: unknown;
    }>;
    captions: TimedCue[];
    audio: {
      mode: 'voiceover' | 'music-only' | 'silent';
      narration: string | null;
      music: unknown | null;
      effects: unknown[];
    };
  };
  scenes: unknown[];
};

export const resolveMotionCanvasTiming: (
  spec: VideoSpec,
  timings: WordTimingFile | null,
) => VideoSpec;

export const buildMasterTimeline: (input: {
  spec: VideoSpec;
  timings?: WordTimingFile | null;
  locale?: string;
  audioMode: 'voiceover' | 'music-only' | 'silent';
}) => {spec: VideoSpec; timeline: MasterTimeline};
