export const MAX_VIDEO_SECONDS = 30 * 60;

export const LONG_FORM_MINUTES = [5, 10, 15, 20, 25, 30] as const;

export const MOTION_EXPLAINER_SECONDS = [30, 33, 45, 60] as const;

export type LongFormMinutes = (typeof LONG_FORM_MINUTES)[number];
export type MotionExplainerSeconds = (typeof MOTION_EXPLAINER_SECONDS)[number];

export const secondsForVideoFormat = (
  format: 'reel' | 'full',
  longFormMinutes: LongFormMinutes = 5,
) => (format === 'reel' ? 60 : longFormMinutes * 60);

export const sceneCountForVideo = (
  format: 'reel' | 'full',
  targetSeconds: number,
) => (format === 'reel' ? 8 : 3 + Math.ceil(targetSeconds / 30));

export const voiceoverWordRange = (
  format: 'reel' | 'full',
  targetSeconds: number,
): [number, number] => {
  const minutes = targetSeconds / 60;
  const wordsPerMinute = format === 'reel' ? [135, 150] : [140, 156];
  return [
    Math.round(minutes * wordsPerMinute[0]),
    Math.round(minutes * wordsPerMinute[1]),
  ];
};

export const musicPlanningWordRange = (
  format: 'reel' | 'full',
  targetSeconds: number,
): [number, number] => {
  if (format === 'reel') return [55, 90];
  const scale = targetSeconds / 300;
  return [Math.round(220 * scale), Math.round(360 * scale)];
};
