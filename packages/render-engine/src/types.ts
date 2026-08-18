import type {CancelSignal} from '@remotion/renderer';
import type {ChannelProfile} from '@video-kit/core/channels';
import type {
  FrameSelector,
  OutputKind,
  OutputVariant,
  OutputVariantId,
} from '@video-kit/core/output';
import type {VideoSpec} from '@video-kit/core/spec';

/**
 * What every producer returns, whatever it produced. Uniform metadata is the
 * point: the job runner records these straight onto artifact rows, and the CLI
 * writes them into the package manifest, without either knowing which kind of
 * artifact it is holding.
 */
export type ProducedArtifact = {
  variantId: OutputVariantId;
  kind: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  /** Position within a still sequence. */
  index?: number;
  durationInFrames?: number;
};

export type BrowserOptions = {
  browserExecutable?: string | null;
  chromeMode?: string;
  concurrency?: number | null;
};

export type ProduceContext = {
  serveUrl: string;
  spec: VideoSpec;
  channel: ChannelProfile;
  variant: OutputVariant;
  /** Directory this variant's files are written into. */
  outDir: string;
  browser: BrowserOptions;
  cancelSignal?: CancelSignal;
  onProgress?: (fraction: number) => void;
  /**
   * Artifacts already produced in this run, so a derived variant (a PDF built
   * from carousel slides) can read its source instead of re-rendering it.
   */
  produced: ReadonlyMap<OutputVariantId, ProducedArtifact[]>;
};

export type Producer = (context: ProduceContext) => Promise<ProducedArtifact[]>;

export type ProducerRegistry = Record<OutputKind, Producer>;

export type ResolvedComposition = {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
};

export type {FrameSelector};
