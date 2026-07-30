import type {VideoSpec} from '../types';
import {sceneOffsets, totalFrames} from '../types';

export type FrameRange = {start: number; end: number};

export const narrationRanges = (spec: VideoSpec): FrameRange[] => {
  const ranges = sceneOffsets(spec)
    .filter(({scene}) => Boolean(scene.narration?.trim()))
    .map(({start, end}) => ({start, end}));

  return ranges.reduce<FrameRange[]>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      return merged;
    }
    merged.push({...range});
    return merged;
  }, []);
};

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * Math.min(1, Math.max(0, progress));

export const duckingGainAtFrame = ({
  frame,
  ranges,
  gain,
  attackFrames,
  releaseFrames,
}: {
  frame: number;
  ranges: FrameRange[];
  gain: number;
  attackFrames: number;
  releaseFrames: number;
}) => {
  let result = 1;

  for (const range of ranges) {
    if (frame >= range.start && frame < range.end) {
      result = Math.min(result, gain);
      continue;
    }
    if (
      attackFrames > 0 &&
      frame >= range.start - attackFrames &&
      frame < range.start
    ) {
      result = Math.min(
        result,
        mix(1, gain, (frame - (range.start - attackFrames)) / attackFrames),
      );
    }
    if (
      releaseFrames > 0 &&
      frame >= range.end &&
      frame < range.end + releaseFrames
    ) {
      result = Math.min(
        result,
        mix(gain, 1, (frame - range.end) / releaseFrames),
      );
    }
  }

  return result;
};

export const musicFadeAtFrame = ({
  frame,
  startFrame,
  endFrame,
  fadeInFrames,
  fadeOutFrames,
}: {
  frame: number;
  startFrame: number;
  endFrame: number;
  fadeInFrames: number;
  fadeOutFrames: number;
}) => {
  const fadeIn =
    fadeInFrames > 0
      ? Math.min(1, Math.max(0, (frame - startFrame) / fadeInFrames))
      : 1;
  const fadeOut =
    fadeOutFrames > 0
      ? Math.min(1, Math.max(0, (endFrame - frame) / fadeOutFrames))
      : 1;
  return Math.min(fadeIn, fadeOut);
};

export const audioMixDefaults = (spec: VideoSpec) => ({
  endFrame: totalFrames(spec),
  narration: narrationRanges(spec),
  ducking: {
    gain: spec.soundtrack?.ducking?.gain ?? 0.3,
    attackFrames: spec.soundtrack?.ducking?.attackFrames ?? 6,
    releaseFrames: spec.soundtrack?.ducking?.releaseFrames ?? 12,
  },
});
