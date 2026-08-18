import {z} from 'zod';
import {AccentSchema, accented, sceneSchema} from '../base';

export const TitleSceneSchema = sceneSchema('title', {
  kicker: z.string().max(120).optional(),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(400).optional(),
});

export const StepsSceneSchema = sceneSchema('steps', {
  kicker: z.string().max(120).optional(),
  items: z
    .array(
      accented({
        label: z.string().min(1).max(200),
        detail: z.string().max(400).optional(),
      }),
    )
    .min(1)
    .max(8),
  footnote: z.string().max(300).optional(),
});

export const CompareSceneSchema = sceneSchema('compare', {
  title: z.string().max(300).optional(),
  kicker: z.string().max(120).optional(),
  left: accented({
    heading: z.string().min(1).max(200),
    points: z.array(z.string().max(300)).min(1).max(8),
  }),
  right: accented({
    heading: z.string().min(1).max(200),
    points: z.array(z.string().max(300)).min(1).max(8),
  }),
});

export const FlowSceneSchema = sceneSchema('flow', {
  title: z.string().max(300).optional(),
  kicker: z.string().max(120).optional(),
  steps: z
    .array(
      accented({
        label: z.string().min(1).max(200),
        detail: z.string().max(400).optional(),
      }),
    )
    .min(1)
    .max(8),
});

export const CalloutSceneSchema = sceneSchema('callout', {
  text: z.string().min(1).max(600),
  attribution: z.string().max(200).optional(),
});

export const KineticTextSceneSchema = sceneSchema('kineticText', {
  /** Short punchy phrases shown one after another, filling the frame. */
  beats: z
    .array(
      z.strictObject({
        text: z.string().min(1).max(200),
        accent: AccentSchema.optional(),
        /**
         * Frames this beat holds the screen. Beats without an explicit hold
         * split the remaining scene time evenly.
         */
        holdFrames: z.number().int().min(1).max(3_000).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const OutroSceneSchema = sceneSchema('outro', {
  handle: z.string().max(120).optional(),
  tagline: z.string().max(300).optional(),
  cta: z.string().max(200).optional(),
  /** Optional monospace summary block, e.g. the concept in three lines. */
  recap: z.array(z.string().max(300)).max(8).optional(),
});
