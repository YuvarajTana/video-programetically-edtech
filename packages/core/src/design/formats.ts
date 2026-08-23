/**
 * Compatibility aliases.
 *
 * The canonical table is `@video-kit/core/output`'s ASPECTS. These names are
 * kept because `renderProfile` and `FormatId` are threaded through the studio,
 * the job pipeline, and the CLI; they will retire once those call sites move to
 * AspectId. Do not add entries here — add them to output/aspects.ts.
 */
export {
  ASPECTS as FORMATS,
  ASPECT_IDS as FORMAT_IDS,
  aspectFor as formatFor,
  inferAspect,
} from '../output/aspects';
export type {AspectDef as FormatDef, AspectId as FormatId} from '../output/aspects';
