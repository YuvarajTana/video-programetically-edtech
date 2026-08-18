import {renderMedia} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {variantOutputName} from '@video-kit/core/output';
import {describeArtifact, selectFor} from '../composition';
import type {Producer} from '../types';

export const videoProducer: Producer = async ({
  serveUrl,
  spec,
  channel,
  variant,
  outDir,
  browser,
  cancelSignal,
  onProgress,
}) => {
  if (variant.kind !== 'video') throw new Error('videoProducer got a non-video variant.');
  const {composition, inputProps} = await selectFor({
    serveUrl,
    spec,
    channel,
    variant,
    browser,
  });

  mkdirSync(outDir, {recursive: true});
  const output = join(outDir, variantOutputName(variant).file!);

  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    codec: variant.encoding.codec,
    crf: variant.encoding.crf,
    muted: !variant.encoding.audio,
    outputLocation: output,
    overwrite: true,
    cancelSignal,
    browserExecutable: browser.browserExecutable ?? undefined,
    chromeMode: browser.chromeMode as never,
    concurrency: browser.concurrency ?? undefined,
    onProgress: ({progress}) => onProgress?.(progress),
  });

  return [
    describeArtifact({
      variant,
      path: output,
      width: composition.width,
      height: composition.height,
      durationInFrames: composition.durationInFrames,
    }),
  ];
};
