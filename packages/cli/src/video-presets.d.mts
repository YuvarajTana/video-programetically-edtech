import type {VideoSpec} from '@video-kit/core/spec';

export type VideoPresetId =
  | 'reel-concept'
  | 'reel-code'
  | 'reel-compare'
  | 'youtube-deep-dive';

export type VideoPreset = {
  id: VideoPresetId;
  label: string;
  description: string;
  durationSeconds: number;
  deliveries: VideoSpec['deliveries'];
  template: string;
  buildScenes: (title: string) => VideoSpec['scenes'];
};

export const VIDEO_PRESETS: Record<VideoPresetId, VideoPreset>;
export const presetIds: VideoPresetId[];

export function buildVideoSpec(input: {
  channel: string;
  slug: string;
  title: string;
  objective: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  presetId: VideoPresetId;
}): VideoSpec;

export function renderVideoSource(input: {
  exportName: string;
  spec: VideoSpec;
}): string;

export function renderScriptTemplate(input: {
  topicId?: string;
  presetId: VideoPresetId;
  spec: VideoSpec;
}): string;
