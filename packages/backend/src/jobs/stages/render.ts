import {copyFileSync, mkdirSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {config} from '@video-kit/core/config';
import {OUTPUT_VARIANTS, variantsFor} from '@video-kit/core/output';
import {produceVariants} from '@video-kit/render-engine';
import type {JobContext} from '../context';

/**
 * Produce every output the spec asks for.
 *
 * Which artifacts those are is data — the variant registry — so this stage does
 * not know what a carousel or a GIF is; it renders whatever `variantsFor`
 * returns and files the results.
 */
export const runRenderStage = async (context: JobContext) => {
  const {jobId, spec, snapshot, dirs} = context;
  await context.stage(
    'render',
    0.48,
    'Producing every requested output from the mastered composition.',
  );

  const variants = variantsFor(spec, snapshot.channel);
  const renderRoot = join(dirs.jobRoot, 'renders');
  const produced = await produceVariants({
    spec,
    channel: snapshot.channel,
    variants,
    outDir: renderRoot,
    browser: {
      browserExecutable: config.browserExecutable(),
      chromeMode: config.chromeMode(),
      concurrency: config.renderConcurrency() ?? null,
    },
    cancelSignal: context.cancelSignal,
    onProgress: (variant, fraction) => {
      const index = variants.indexOf(variant);
      context.reportProgress(
        'render',
        0.5 + ((index + fraction) / Math.max(1, variants.length)) * 0.3,
        Math.round(fraction * 100) % 10 === 0,
      );
    },
  });

  // Artifacts are filed under the job's artifact root so downloads keep
  // working; the delivery id is still written where a variant stands in for
  // one, so rows created before the variant registry stay comparable.
  for (const artifact of produced) {
    const packaged = join(dirs.artifactRoot, relative(renderRoot, artifact.path));
    mkdirSync(dirname(packaged), {recursive: true});
    copyFileSync(artifact.path, packaged);
    const variant = OUTPUT_VARIANTS[artifact.variantId];
    await context.recordArtifact(
      packaged,
      artifact.kind,
      variant?.legacyDeliveryId ?? null,
      artifact.mimeType,
    );
  }

  void jobId;
};
