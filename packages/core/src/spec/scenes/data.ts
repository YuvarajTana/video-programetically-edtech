import {z} from 'zod';
import {accented, sceneSchema} from '../base';

export const StatsSceneSchema = sceneSchema('stats', {
  title: z.string().max(300).optional(),
  kicker: z.string().max(120).optional(),
  cards: z
    .array(
      accented({
        label: z.string().min(1).max(200),
        value: z.string().min(1).max(120),
        note: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(8),
});

export const BigStatSceneSchema = sceneSchema('bigStat', {
  kicker: z.string().max(120).optional(),
  value: z.string().min(1).max(120),
  label: z.string().max(200).optional(),
  note: z.string().max(300).optional(),
});

export const ChartSceneSchema = sceneSchema('chart', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  /**
   * Bars share one hue (the scene accent) because they encode magnitude, not
   * identity — identity lives in the label under each bar. Use highlightIndex
   * to spotlight one bar and mute the rest.
   */
  bars: z
    .array(
      accented({
        label: z.string().min(1).max(120),
        value: z.number(),
      }),
    )
    .min(1)
    .max(20),
  /** Rendered after each value, e.g. "%", "ms", "×". */
  unit: z.string().max(20).optional(),
  highlightIndex: z.number().int().min(0).max(19).optional(),
  footnote: z.string().max(300).optional(),
});

export const TimelineSceneSchema = sceneSchema('timeline', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  events: z
    .array(
      accented({
        /** Marker caption, e.g. a year, version, or step time. */
        time: z.string().min(1).max(60),
        label: z.string().min(1).max(200),
        detail: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const MeterSceneSchema = sceneSchema('meter', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  /** What the meter measures, shown above the bar. */
  label: z.string().max(200).optional(),
  max: z.number(),
  /** Fill animates from → to. Defaults from 0. */
  from: z.number().optional(),
  to: z.number(),
  unit: z.string().max(20).optional(),
  /** A limit line on the bar, e.g. the context window size. */
  marker: z
    .strictObject({
      value: z.number(),
      label: z.string().max(200).optional(),
    })
    .optional(),
  note: z.string().max(300).optional(),
});

export const NumberLineSceneSchema = sceneSchema('numberLine', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  min: z.number(),
  max: z.number(),
  /** Tick spacing. Defaults to 1. */
  step: z.number().optional(),
  /** Values marked on the line, revealed in order. */
  marks: z
    .array(
      accented({
        value: z.number(),
        label: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(40),
  /** An animated hop, e.g. from 3 to 5 to show adding two. */
  jump: accented({from: z.number(), to: z.number()}).optional(),
});
