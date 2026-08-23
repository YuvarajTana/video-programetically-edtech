import type {ChannelProfile} from '@video-kit/core/channels';
import {variantById} from '@video-kit/core/output';
import type {OutputVariant, OutputVariantId} from '@video-kit/core/output';
import type {VideoSpec} from '@video-kit/core/spec';
import {copyFileSync, mkdirSync} from 'node:fs';
import {extname, join} from 'node:path';
import {PRODUCERS} from './producers';
import {getServeUrl} from './serve-url';
import type {BrowserOptions, ProducedArtifact} from './types';

/**
 * Pull in the variants a document depends on. Asking for just the carousel PDF
 * is a reasonable request; it should render the slides it needs rather than
 * failing because they were not listed too.
 */
const withDependencies = (variants: OutputVariant[]) => {
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  for (const variant of variants) {
    if (variant.kind !== 'document' || byId.has(variant.from)) continue;
    byId.set(variant.from, variantById(variant.from));
  }
  return [...byId.values()];
};

/**
 * Documents read another variant's artifacts, so they must run after it.
 * Everything else is independent; a stable sort keeps output order predictable.
 */
const orderByDependency = (variants: OutputVariant[]) => {
  const ready: OutputVariant[] = [];
  const deferred: OutputVariant[] = [];
  for (const variant of variants) {
    (variant.kind === 'document' ? deferred : ready).push(variant);
  }
  return [...ready, ...deferred];
};

/**
 * Two variants that render the same pixels differ only in where they are filed.
 * `youtube-short` and `instagram-reel` are both a portrait h264 cut, and used to
 * be rendered once and copied; keeping that saves a full encode per platform.
 */
const renderKey = (variant: OutputVariant) =>
  JSON.stringify([
    variant.kind,
    variant.composition,
    variant.aspect,
    'encoding' in variant ? variant.encoding : null,
    'frames' in variant ? variant.frames : null,
    variant.overlays ?? {},
  ]);

export type ProduceOptions = {
  spec: VideoSpec;
  channel: ChannelProfile;
  variants: OutputVariant[];
  /** Directory artifacts are written into. */
  outDir: string;
  entryPoint?: string;
  publicDir?: string;
  browser?: BrowserOptions;
  cancelSignal?: Parameters<(typeof PRODUCERS)['video']>[0]['cancelSignal'];
  /** Called as each variant advances, for job progress reporting. */
  onProgress?: (variant: OutputVariant, fraction: number) => void;
};

/**
 * Turn a spec plus a list of variants into artifacts.
 *
 * This is the single render path. Before it existed the CLI and the API job
 * runner each had their own, which is why they produced different cover images
 * and why only one of them could make a carousel.
 */
export const produceVariants = async ({
  spec,
  channel,
  variants,
  outDir,
  entryPoint,
  publicDir,
  browser = {},
  cancelSignal,
  onProgress,
}: ProduceOptions): Promise<ProducedArtifact[]> => {
  if (!variants.length) return [];
  const serveUrl = await getServeUrl({entryPoint, publicDir});
  mkdirSync(outDir, {recursive: true});

  const produced = new Map<OutputVariantId, ProducedArtifact[]>();
  const byRenderKey = new Map<string, ProducedArtifact[]>();
  const all: ProducedArtifact[] = [];

  for (const variant of orderByDependency(withDependencies(variants))) {
    const key = renderKey(variant);
    const identical = variant.kind === 'document' ? undefined : byRenderKey.get(key);

    const artifacts = identical
      ? identical.map((source) => {
          const target = join(
            outDir,
            `${variant.artifact.filenameStem}${extname(source.path)}`,
          );
          if (target !== source.path) copyFileSync(source.path, target);
          return {...source, variantId: variant.id, kind: variant.artifact.kind, path: target};
        })
      : await PRODUCERS[variant.kind]({
          serveUrl,
          spec,
          channel,
          variant,
          outDir,
          browser,
          cancelSignal,
          produced,
          onProgress: (fraction) => onProgress?.(variant, fraction),
        });

    if (!identical && variant.kind !== 'document') byRenderKey.set(key, artifacts);
    produced.set(variant.id, artifacts);
    all.push(...artifacts);
    onProgress?.(variant, 1);
  }

  return all;
};
