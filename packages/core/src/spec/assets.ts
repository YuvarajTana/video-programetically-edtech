import {z} from 'zod';

/**
 * A managed image path, restricted to the two public directories the studio
 * writes into and refusing traversal segments.
 */
export const ManagedImagePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(400)
  .regex(
    /^(?:images|generated)\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:png|jpe?g|webp)$/i,
    'Use a PNG, JPEG, or WebP path beneath public/images or public/generated.',
  )
  .refine(
    (value) => value.split('/').every((segment) => segment !== '.' && segment !== '..'),
    'Image paths cannot contain traversal segments.',
  );

/** Any picture or footage shown on screen must carry its provenance. */
export const LicensedVisualAssetFields = {
  /** Path relative to public/. */
  src: z.string().min(1).max(400),
  /** Human-readable creator or library attribution. */
  credit: z.string().min(1).max(200),
  /** License identifier or "original" for project-owned media. */
  license: z.string().min(1).max(120),
  sourceUrl: z.string().max(600).optional(),
};
