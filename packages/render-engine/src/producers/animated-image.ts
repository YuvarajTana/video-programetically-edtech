import {renderMedia} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {variantOutputName} from '@video-kit/core/output';
import {describeArtifact, selectFor} from '../composition';
import {resolveRange} from '../frames';
import type {Producer} from '../types';

/**
 * The registry speaks GIF, where a loop count of 0 means forever. Remotion's
 * `numberOfGifLoops` speaks the opposite dialect: `null` is forever and `0`
 * means play once, which it hands to ffmpeg as `-loop -1`. Passing our 0
 * straight through produced a GIF with no NETSCAPE block — a variant called
 * `loop-gif` that played once and stopped.
 */
const toRemotionLoops = (loop: number) => (loop === 0 ? null : loop);

/**
 * Remotion encodes GIFs natively, so a looping clip is a frame range plus a
 * sampling step. `scale` is derived from the variant's maxWidth because a GIF
 * at full 1080 width is unusable in a feed.
 */
export const animatedImageProducer: Producer = async ({
  serveUrl,
  spec,
  channel,
  variant,
  outDir,
  browser,
  cancelSignal,
  onProgress,
}) => {
  if (variant.kind !== 'animated-image') {
    throw new Error('animatedImageProducer got a non-animated variant.');
  }
  const {composition, inputProps} = await selectFor({
    serveUrl,
    spec,
    channel,
    variant,
    browser,
  });

  mkdirSync(outDir, {recursive: true});
  const output = join(outDir, variantOutputName(variant).file!);
  const {from, to, everyNthFrame} = resolveRange(variant.frames, composition);
  const scale = variant.encoding.maxWidth
    ? Math.min(1, variant.encoding.maxWidth / composition.width)
    : 1;

  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    codec: 'gif',
    outputLocation: output,
    frameRange: [from, to],
    everyNthFrame,
    numberOfGifLoops: toRemotionLoops(variant.encoding.loop),
    scale,
    muted: true,
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
      width: Math.round(composition.width * scale),
      height: Math.round(composition.height * scale),
      durationInFrames: to - from + 1,
    }),
  ];
};
