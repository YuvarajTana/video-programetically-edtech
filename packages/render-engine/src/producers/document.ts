import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {variantOutputName} from '@video-kit/core/output';
import {jpegsToPdf} from '../pdf';
import type {Producer, ProducedArtifact} from '../types';

/**
 * A document is assembled from another variant's artifacts rather than
 * rendered. That is what the carousel script already did by hand, and it means
 * a PDF of any still sequence costs no extra render pass.
 */
export const documentProducer: Producer = async ({variant, outDir, produced}) => {
  if (variant.kind !== 'document') {
    throw new Error('documentProducer got a non-document variant.');
  }
  const source = produced.get(variant.from);
  if (!source?.length) {
    throw new Error(
      `Variant "${variant.id}" needs "${variant.from}" to run first, but it produced nothing.`,
    );
  }

  const pages = [...source]
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
    .filter((artifact) => artifact.mimeType === 'image/jpeg');
  if (!pages.length) {
    throw new Error(
      `Variant "${variant.id}" can only assemble JPEG pages; "${variant.from}" produced none.`,
    );
  }

  mkdirSync(outDir, {recursive: true});
  const output = join(outDir, variantOutputName(variant).file!);
  writeFileSync(output, jpegsToPdf(pages.map((page) => readFileSync(page.path))));

  const artifact: ProducedArtifact = {
    variantId: variant.id,
    kind: variant.artifact.kind,
    path: output,
    mimeType: variant.artifact.mimeType,
    sizeBytes: readFileSync(output).length,
    width: pages[0].width,
    height: pages[0].height,
  };
  return [artifact];
};
