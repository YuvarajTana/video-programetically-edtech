import type {ChannelProfile} from '../channels/types';
import type {VideoSpec} from '../spec';
import type {DeliveryId} from '../publishing/types';
import type {OutputVariant, OutputVariantId, VideoEncoding} from './types';

/** The house video encode. Matches what both render paths used before. */
const h264: VideoEncoding = {codec: 'h264', container: 'mp4', crf: 18, audio: true};

/**
 * Every artifact the kit knows how to produce.
 *
 * Adding one is a single entry here plus, only if the OutputKind is new, a
 * producer in @video-kit/render-engine. The API, the CLI, the job manifest and
 * the studio picker all read this map, so nothing else has to be told.
 *
 * The five ids that carry `legacyDeliveryId` keep the exact filenames and
 * capture frames they had before the registry existed, so existing artifact
 * rows and out/ trees stay valid.
 */
export const OUTPUT_VARIANTS: Record<OutputVariantId, OutputVariant> = {
  'youtube-long': {
    id: 'youtube-long',
    label: 'YouTube 16:9',
    kind: 'video',
    aspect: 'landscape',
    platform: 'youtube',
    composition: 'video',
    encoding: h264,
    artifact: {kind: 'video', filenameStem: 'youtube-long', mimeType: 'video/mp4'},
    legacyDeliveryId: 'youtube-long',
  },
  'youtube-short': {
    id: 'youtube-short',
    label: 'YouTube Short 9:16',
    kind: 'video',
    aspect: 'portrait',
    platform: 'youtube',
    composition: 'video',
    encoding: h264,
    artifact: {kind: 'video', filenameStem: 'youtube-short', mimeType: 'video/mp4'},
    legacyDeliveryId: 'youtube-short',
  },
  'instagram-reel': {
    id: 'instagram-reel',
    label: 'Instagram Reel 9:16',
    kind: 'video',
    aspect: 'portrait',
    platform: 'instagram',
    composition: 'video',
    encoding: h264,
    artifact: {kind: 'video', filenameStem: 'instagram-reel', mimeType: 'video/mp4'},
    legacyDeliveryId: 'instagram-reel',
  },
  'instagram-feed': {
    id: 'instagram-feed',
    label: 'Instagram Feed 1:1',
    kind: 'video',
    aspect: 'square',
    platform: 'instagram',
    composition: 'video',
    encoding: h264,
    artifact: {kind: 'video', filenameStem: 'instagram-feed', mimeType: 'video/mp4'},
    legacyDeliveryId: 'instagram-feed',
  },

  // Covers. One per delivery, rendered from the dedicated Cover composition at
  // frame 0 — matching what the CLI has always produced.
  'youtube-long-cover': {
    id: 'youtube-long-cover',
    caption: 'YouTube 16:9',
    label: 'YouTube 16:9 cover',
    kind: 'still',
    aspect: 'landscape',
    platform: 'youtube',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'png'},
    artifact: {kind: 'cover', filenameStem: 'youtube-long-cover', mimeType: 'image/png'},
    legacyDeliveryId: 'youtube-long',
  },
  'youtube-short-cover': {
    id: 'youtube-short-cover',
    caption: 'YouTube Short 9:16',
    label: 'YouTube Short cover',
    kind: 'still',
    aspect: 'portrait',
    platform: 'youtube',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'png'},
    artifact: {kind: 'cover', filenameStem: 'youtube-short-cover', mimeType: 'image/png'},
    legacyDeliveryId: 'youtube-short',
  },
  'instagram-reel-cover': {
    id: 'instagram-reel-cover',
    caption: 'Instagram Reel 9:16',
    label: 'Instagram Reel cover',
    kind: 'still',
    aspect: 'portrait',
    platform: 'instagram',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'png'},
    artifact: {kind: 'cover', filenameStem: 'instagram-reel-cover', mimeType: 'image/png'},
    legacyDeliveryId: 'instagram-reel',
  },
  'instagram-feed-cover': {
    id: 'instagram-feed-cover',
    caption: 'Instagram Feed 1:1',
    label: 'Instagram Feed cover',
    kind: 'still',
    aspect: 'square',
    platform: 'instagram',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'png'},
    artifact: {kind: 'cover', filenameStem: 'instagram-feed-cover', mimeType: 'image/png'},
    legacyDeliveryId: 'instagram-feed',
  },
  'instagram-carousel-cover': {
    id: 'instagram-carousel-cover',
    caption: 'Instagram Carousel 4:5',
    label: 'Instagram Carousel cover',
    kind: 'still',
    aspect: 'carousel',
    platform: 'instagram',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'png'},
    artifact: {
      kind: 'cover',
      filenameStem: 'instagram-carousel-cover',
      mimeType: 'image/png',
    },
    legacyDeliveryId: 'instagram-carousel',
  },

  // Carousel slides, captured 80% through each scene: entrances finished, exit
  // fade not yet begun. This is the arithmetic scripts/carousel.mjs used.
  'instagram-carousel-slides': {
    id: 'instagram-carousel-slides',
    label: 'Instagram Carousel slides',
    kind: 'still-sequence',
    aspect: 'carousel',
    platform: 'instagram',
    composition: 'video',
    frames: {at: 'per-scene', through: 0.8},
    encoding: {format: 'jpeg', quality: 95},
    artifact: {kind: 'slides', filenameStem: 'slides', mimeType: 'image/jpeg'},
    legacyDeliveryId: 'instagram-carousel',
  },
  'instagram-carousel-pdf': {
    id: 'instagram-carousel-pdf',
    label: 'Carousel PDF (LinkedIn document post)',
    kind: 'document',
    aspect: 'carousel',
    platform: 'instagram',
    composition: 'video',
    from: 'instagram-carousel-slides',
    encoding: {format: 'pdf'},
    artifact: {kind: 'document', filenameStem: 'carousel', mimeType: 'application/pdf'},
    legacyDeliveryId: 'instagram-carousel',
  },

  // ---------------------------------------------------------- new variants
  poster: {
    id: 'poster',
    label: 'Poster 4:5',
    kind: 'still',
    aspect: 'carousel',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'png'},
    artifact: {kind: 'poster', filenameStem: 'poster', mimeType: 'image/png'},
  },
  'og-image': {
    id: 'og-image',
    label: 'Open Graph card 16:9',
    kind: 'still',
    aspect: 'landscape',
    composition: 'cover',
    frames: {at: 'frame', frame: 0},
    encoding: {format: 'jpeg', quality: 90},
    artifact: {kind: 'poster', filenameStem: 'og-image', mimeType: 'image/jpeg'},
  },
  'loop-gif': {
    id: 'loop-gif',
    label: 'Looping GIF 9:16',
    kind: 'animated-image',
    aspect: 'portrait',
    composition: 'video',
    frames: {at: 'range', fromFraction: 0, toFraction: 0.2, sampleFps: 12},
    encoding: {format: 'gif', fps: 12, loop: 0, maxWidth: 540},
    overlays: {captions: false, chrome: false, rail: false, audio: false},
    artifact: {kind: 'animated-image', filenameStem: 'loop', mimeType: 'image/gif'},
  },
  'storyboard-sheet': {
    id: 'storyboard-sheet',
    label: 'Storyboard contact sheet',
    kind: 'still-sequence',
    aspect: 'landscape',
    composition: 'video',
    frames: {at: 'per-scene', through: 0.5},
    encoding: {format: 'jpeg', quality: 80},
    artifact: {kind: 'slides', filenameStem: 'storyboard', mimeType: 'image/jpeg'},
  },
};

export const OUTPUT_VARIANT_IDS = Object.keys(OUTPUT_VARIANTS);

export const variantById = (id: OutputVariantId) => {
  const variant = OUTPUT_VARIANTS[id];
  if (!variant) throw new Error(`Unknown output variant "${id}".`);
  return variant;
};

/**
 * The compatibility table. `spec.deliveries` is the vocabulary persisted in
 * project revisions and artifact rows, so it stays readable forever; each
 * delivery simply names the variants it always implied.
 */
export const LEGACY_DELIVERY_VARIANTS: Record<DeliveryId, OutputVariantId[]> = {
  'youtube-long': ['youtube-long', 'youtube-long-cover'],
  'youtube-short': ['youtube-short', 'youtube-short-cover'],
  'instagram-reel': ['instagram-reel', 'instagram-reel-cover'],
  'instagram-feed': ['instagram-feed', 'instagram-feed-cover'],
  'instagram-carousel': [
    'instagram-carousel-slides',
    'instagram-carousel-pdf',
    'instagram-carousel-cover',
  ],
};

/**
 * Which variants a spec wants. An explicit `spec.outputs` wins; otherwise the
 * deliveries (or the channel default) expand through the legacy table, so
 * nothing that was authored before the registry has to be rewritten.
 */
export const variantsFor = (
  spec: Pick<VideoSpec, 'deliveries' | 'outputs'>,
  channel: Pick<ChannelProfile, 'defaultDeliveries'>,
): OutputVariant[] => {
  const ids = spec.outputs?.length
    ? spec.outputs
    : (spec.deliveries ?? channel.defaultDeliveries).flatMap(
        (delivery) => LEGACY_DELIVERY_VARIANTS[delivery] ?? [],
      );
  return [...new Set(ids)].map(variantById);
};

/** File extension an artifact of this variant carries. */
export const variantExtension = (variant: OutputVariant) => {
  switch (variant.kind) {
    case 'video':
      return variant.encoding.container;
    case 'animated-image':
      return variant.encoding.format;
    case 'document':
      return variant.encoding.format;
    case 'still':
    case 'still-sequence':
      return variant.encoding.format === 'jpeg' ? 'jpg' : 'png';
  }
};

/**
 * Where a variant's output lands relative to an output directory.
 *
 * Sequences own a directory of numbered slides; everything else is one file.
 * Naming lives here so producers and packaging cannot disagree about it — they
 * used to, which is why the CLI and the job runner wrote different trees.
 */
export const variantOutputName = (variant: OutputVariant) =>
  variant.kind === 'still-sequence'
    ? {directory: variant.artifact.filenameStem, extension: variantExtension(variant)}
    : {
        file: `${variant.artifact.filenameStem}.${variantExtension(variant)}`,
        extension: variantExtension(variant),
      };

export const slideName = (index: number, extension: string) =>
  `slide-${String(index + 1).padStart(2, '0')}.${extension}`;
