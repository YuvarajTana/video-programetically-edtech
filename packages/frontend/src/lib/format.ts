import type {EditableVideoSpec} from '@video-kit/core/contracts';
import {totalFrames} from '@video-kit/core/spec';

export const duration = (spec: EditableVideoSpec) =>
  totalFrames(spec as unknown as Parameters<typeof totalFrames>[0]) /
  (spec.fps ?? 30);

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
};

export const timeAgo = (value: string) => {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
};
