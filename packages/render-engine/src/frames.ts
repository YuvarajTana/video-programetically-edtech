import type {FrameSelector} from '@video-kit/core/output';
import {sceneOffsets, type VideoSpec} from '@video-kit/core/spec';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Turn a variant's frame selector into concrete frame numbers.
 *
 * `per-scene` reproduces the arithmetic scripts/carousel.mjs used, so carousel
 * slides land on exactly the frames they did before: the entrance animation has
 * finished and the exit fade has not started.
 */
export const resolveFrames = (
  selector: FrameSelector,
  spec: VideoSpec,
  composition: {durationInFrames: number; fps: number},
): number[] => {
  const last = Math.max(0, composition.durationInFrames - 1);

  switch (selector.at) {
    case 'frame':
      return [clamp(selector.frame, 0, last)];

    case 'seconds':
      return [clamp(Math.round(selector.seconds * composition.fps), 0, last)];

    case 'fraction':
      return [clamp(Math.round(selector.fraction * last), 0, last)];

    case 'per-scene':
      return sceneOffsets(spec).map(({start, scene}) => {
        const within = Math.max(
          Math.round(scene.durationInFrames * selector.through) - 1,
          0,
        );
        return clamp(
          Math.min(start + within, start + scene.durationInFrames - 1),
          0,
          last,
        );
      });

    case 'range': {
      const from = clamp(Math.round(selector.fromFraction * last), 0, last);
      const to = clamp(Math.round(selector.toFraction * last), from, last);
      const step = Math.max(1, Math.round(composition.fps / selector.sampleFps));
      const frames: number[] = [];
      for (let frame = from; frame <= to; frame += step) frames.push(frame);
      // A range shorter than one step still deserves a frame.
      return frames.length ? frames : [from];
    }
  }
};

/** Frame range and sampling step for producers that render a span, not stills. */
export const resolveRange = (
  selector: Extract<FrameSelector, {at: 'range'}>,
  composition: {durationInFrames: number; fps: number},
) => {
  const last = Math.max(0, composition.durationInFrames - 1);
  const from = clamp(Math.round(selector.fromFraction * last), 0, last);
  const to = clamp(Math.round(selector.toFraction * last), from, last);
  return {
    from,
    to,
    everyNthFrame: Math.max(1, Math.round(composition.fps / selector.sampleFps)),
  };
};
