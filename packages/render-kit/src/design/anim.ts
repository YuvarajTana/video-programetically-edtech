import {Easing, interpolate} from 'remotion';

/**
 * Motion vocabulary for the whole kit.
 *
 * Scenes compose these rather than writing bespoke interpolate() calls, so every
 * video shares one feel. Each helper returns a style fragment you spread into a
 * style prop. All easing is the same expressive-decelerate curve unless a helper
 * says otherwise.
 */

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IO = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const fadeIn = (frame: number, at = 0, dur = 16) => ({
  opacity: interpolate(frame, [at, at + dur], [0, 1], {...clamp, easing: EASE}),
});

export const fadeUp = (frame: number, at = 0, dur = 22, distance = 42) => ({
  opacity: interpolate(frame, [at, at + dur * 0.7], [0, 1], {...clamp, easing: EASE}),
  translate: interpolate(frame, [at, at + dur], [`0px ${distance}px`, '0px 0px'], {
    ...clamp,
    easing: EASE,
  }),
});

export const slideIn = (frame: number, at = 0, dur = 24, distance = 60) => ({
  opacity: interpolate(frame, [at, at + dur * 0.6], [0, 1], {...clamp, easing: EASE}),
  translate: interpolate(frame, [at, at + dur], [`${-distance}px 0px`, '0px 0px'], {
    ...clamp,
    easing: EASE,
  }),
});

export const pop = (frame: number, at = 0, dur = 28, from = 0.88) => ({
  opacity: interpolate(frame, [at, at + dur * 0.5], [0, 1], {...clamp, easing: EASE}),
  scale: interpolate(frame, [at, at + dur], [from, 1], {
    ...clamp,
    easing: EASE,
    output: 'perceptual-scale' as const,
  }),
});

/** Draws a rule or underline out from zero width. */
export const drawWidth = (frame: number, at: number, to: number, dur = 24) =>
  interpolate(frame, [at, at + dur], [0, to], {...clamp, easing: EASE});

/** Scene-level fade so cuts never hard-clip. Applied by <Frame> automatically. */
export const sceneFade = (frame: number, duration: number, hold = 10) =>
  interpolate(frame, [0, hold, duration - hold, duration], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.linear,
  });

/** Staggered entry offsets for lists. */
export const stagger = (index: number, gap = 9, at = 0) => at + index * gap;

/** 0 -> 1 progress across an explicit window, eased for motion along a path. */
export const progress = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing: EASE_IO});

/** A soft pulse that peaks and returns, for drawing the eye to one element. */
export const pulse = (frame: number, at: number, dur = 14, peak = 1.06) =>
  interpolate(frame, [at, at + dur * 0.35, at + dur], [1, peak, 1], {
    ...clamp,
    output: 'perceptual-scale' as const,
  });
