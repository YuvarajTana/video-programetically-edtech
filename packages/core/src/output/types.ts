import type {AspectId} from './aspects';
import type {PlatformId} from '../publishing/types';

/**
 * What kind of artifact a variant produces. Adding a member here is the one
 * place the system learns a genuinely new shape of output; everything else
 * (which platform, which aspect, which frames, how it is encoded) is data.
 */
export type OutputKind =
  | 'video'
  | 'still'
  | 'still-sequence'
  | 'animated-image'
  | 'document';

/** Which composition renders the frames: the video timeline, or the cover art. */
export type CompositionFamily = 'video' | 'cover';

/**
 * Which frame(s) to capture. Fractions are of the whole video, so a selector
 * stays correct when narration retimes the scenes.
 */
export type FrameSelector =
  | {at: 'frame'; frame: number}
  | {at: 'seconds'; seconds: number}
  | {at: 'fraction'; fraction: number}
  /** One frame per scene, captured `through` of the way into each scene. */
  | {at: 'per-scene'; through: number}
  | {at: 'range'; fromFraction: number; toFraction: number; sampleFps: number};

export type VideoEncoding = {
  codec: 'h264' | 'h265' | 'vp9';
  container: 'mp4' | 'webm';
  crf?: number;
  audio: boolean;
};

export type ImageEncoding = {
  format: 'png' | 'jpeg';
  /** JPEG quality, 0-100. Ignored for PNG. */
  quality?: number;
};

export type AnimatedEncoding = {
  format: 'gif';
  fps: number;
  /** 0 loops forever. */
  loop: number;
  maxWidth?: number;
};

export type DocumentEncoding = {format: 'pdf'};

/**
 * Overlays this variant suppresses. A poster wants no captions and no progress
 * bar; a silent loop wants no audio. Before this existed the only control was
 * `spec.captions ?? !layout.isLandscape` buried in the renderer.
 */
export type OverlayToggles = {
  captions?: boolean;
  chrome?: boolean;
  rail?: boolean;
  audio?: boolean;
};

export type OutputVariantId = string;

type VariantBase = {
  id: OutputVariantId;
  label: string;
  aspect: AspectId;
  platform?: PlatformId;
  composition: CompositionFamily;
  overlays?: OverlayToggles;
  artifact: {
    /** Recorded on the artifact row, and used to group downloads. */
    kind: string;
    /** Output filename stem. Held stable so existing output trees do not churn. */
    filenameStem: string;
    mimeType: string;
  };
  /**
   * Text the cover composition prints in its corner. Defaults to `label`; set
   * explicitly where the rendered wording must not drift.
   */
  caption?: string;
  /** Set where a variant stands in for a delivery id persisted before the refactor. */
  legacyDeliveryId?: string;
};

export type OutputVariant =
  | (VariantBase & {kind: 'video'; encoding: VideoEncoding})
  | (VariantBase & {kind: 'still'; frames: FrameSelector; encoding: ImageEncoding})
  | (VariantBase & {
      kind: 'still-sequence';
      frames: FrameSelector;
      encoding: ImageEncoding;
    })
  | (VariantBase & {
      kind: 'animated-image';
      frames: Extract<FrameSelector, {at: 'range'}>;
      encoding: AnimatedEncoding;
    })
  /** Documents are assembled from another variant's artifacts, not rendered. */
  | (VariantBase & {
      kind: 'document';
      from: OutputVariantId;
      encoding: DocumentEncoding;
    });
