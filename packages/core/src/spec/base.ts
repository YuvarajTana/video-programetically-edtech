import {z} from 'zod';
import type {Accent} from '../themes/types';

export const AccentSchema = z.enum([
  'primary',
  'secondary',
  'success',
  'attention',
  'info',
]);

/**
 * The renderer's Accent union and this schema describe the same set. Drift is a
 * compile error rather than a runtime surprise.
 */
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const accentsAgree: AssertEqual<Accent, z.infer<typeof AccentSchema>> = true;
void accentsAgree;

/** Fields every scene carries, whatever it draws. */
export const baseSceneFields = {
  /** Stable id, used for caption cues and debugging. Defaults to the index. */
  id: z.string().min(1).max(80).optional(),
  /** Length of the scene in frames. At 30fps, 30 frames = 1 second. */
  durationInFrames: z.number().int().min(15).max(18_000),
  /** Spoken/on-screen captionline. Drives the .srt and the VO script. */
  narration: z.string().max(8_000).optional(),
  /** Optional override for an automatically generated YouTube chapter title. */
  chapterTitle: z.string().max(160).optional(),
  accent: AccentSchema.optional(),
  /**
   * 0-based active stage of the video's rail while this scene plays. Omitted
   * scenes carry the previous scene's stage forward, so set it only when the
   * journey advances.
   */
  railStage: z.number().int().min(0).max(40).optional(),
};

/**
 * Declare one scene type.
 *
 * Strict, so a typo or a stale field is rejected at the boundary instead of
 * being persisted and then crashing the renderer that dereferences it.
 */
export const sceneSchema = <Type extends string, Shape extends z.ZodRawShape>(
  type: Type,
  shape: Shape,
) => z.strictObject({type: z.literal(type), ...baseSceneFields, ...shape});

/** Shorthand for the accent-bearing text rows several scenes share. */
export const accented = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.strictObject({...shape, accent: AccentSchema.optional()});
