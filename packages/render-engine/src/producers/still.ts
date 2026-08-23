import {renderStill} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {variantOutputName} from '@video-kit/core/output';
import {describeArtifact, selectFor} from '../composition';
import {resolveFrames} from '../frames';
import type {Producer} from '../types';

export const stillProducer: Producer = async ({
  serveUrl,
  spec,
  channel,
  variant,
  outDir,
  browser,
  cancelSignal,
  onProgress,
}) => {
  if (variant.kind !== 'still') throw new Error('stillProducer got a non-still variant.');
  const {composition, inputProps} = await selectFor({
    serveUrl,
    spec,
    channel,
    variant,
    browser,
  });

  mkdirSync(outDir, {recursive: true});
  const [frame] = resolveFrames(variant.frames, spec, composition);
  const output = join(outDir, variantOutputName(variant).file!);

  await renderStill({
    composition,
    serveUrl,
    inputProps,
    output,
    frame,
    imageFormat: variant.encoding.format,
    jpegQuality: variant.encoding.quality,
    overwrite: true,
    cancelSignal,
    browserExecutable: browser.browserExecutable ?? undefined,
    chromeMode: browser.chromeMode as never,
  });
  onProgress?.(1);

  return [
    describeArtifact({
      variant,
      path: output,
      width: composition.width,
      height: composition.height,
    }),
  ];
};
