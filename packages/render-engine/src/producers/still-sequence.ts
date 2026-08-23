import {renderStill} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {slideName, variantOutputName} from '@video-kit/core/output';
import {describeArtifact, selectFor} from '../composition';
import {resolveFrames} from '../frames';
import type {Producer} from '../types';

/**
 * One still per selected frame, numbered. This subsumes scripts/carousel.mjs,
 * which was a whole separate CLI because "a delivery that ships as stills" had
 * no representation in the render path.
 */
export const stillSequenceProducer: Producer = async ({
  serveUrl,
  spec,
  channel,
  variant,
  outDir,
  browser,
  cancelSignal,
  onProgress,
}) => {
  if (variant.kind !== 'still-sequence') {
    throw new Error('stillSequenceProducer got a non-sequence variant.');
  }
  const {composition, inputProps} = await selectFor({
    serveUrl,
    spec,
    channel,
    variant,
    browser,
  });

  const {directory: folder, extension} = variantOutputName(variant) as {
    directory: string;
    extension: string;
  };
  const directory = join(outDir, folder);
  mkdirSync(directory, {recursive: true});
  const frames = resolveFrames(variant.frames, spec, composition);
  const artifacts = [];

  for (const [index, frame] of frames.entries()) {
    const output = join(directory, slideName(index, extension));
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
    artifacts.push(
      describeArtifact({
        variant,
        path: output,
        width: composition.width,
        height: composition.height,
        index,
      }),
    );
    onProgress?.((index + 1) / frames.length);
  }

  return artifacts;
};
