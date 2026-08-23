import {z} from 'zod';
import {LicensedVisualAssetFields} from '../assets';
import {sceneSchema} from '../base';

export const ImageSceneSchema = sceneSchema('image', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  image: z.strictObject({
    ...LicensedVisualAssetFields,
    /** cover fills the frame; contain letterboxes. Defaults to cover. */
    fit: z.enum(['cover', 'contain']).optional(),
    /** Slow push-in so stills feel alive. Defaults on for cover fit. */
    kenBurns: z.boolean().optional(),
  }),
  caption: z.string().max(400).optional(),
  /** Hide the automatic on-frame credit line (credit still ships in metadata). */
  hideCredit: z.boolean().optional(),
});

export const VideoClipSceneSchema = sceneSchema('videoClip', {
  kicker: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  clip: z.strictObject({
    ...LicensedVisualAssetFields,
    fit: z.enum(['cover', 'contain']).optional(),
    /** Frames to skip at the start of the source file. */
    trimBefore: z.number().int().min(0).max(180_000).optional(),
    /** Clip audio is muted by default; narration owns the mix. */
    muted: z.boolean().optional(),
    volume: z.number().min(0).max(1).optional(),
  }),
  caption: z.string().max(400).optional(),
  hideCredit: z.boolean().optional(),
});
