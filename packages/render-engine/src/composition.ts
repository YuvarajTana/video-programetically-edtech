import {selectComposition} from '@remotion/renderer';
import type {ChannelProfile} from '@video-kit/core/channels';
import {compositionId, type OutputVariant} from '@video-kit/core/output';
import type {VideoSpec} from '@video-kit/core/spec';
import {statSync} from 'node:fs';
import type {BrowserOptions, ProducedArtifact} from './types';

/**
 * Props handed to a composition. `overlays` is what lets one composition serve
 * several variants: a poster and a reel share the timeline but not the captions
 * or the progress bar.
 */
export type CompositionInput = {
  spec: VideoSpec;
  channel: ChannelProfile;
  renderProfile: OutputVariant['aspect'];
  overlays?: NonNullable<OutputVariant['overlays']>;
  platform?: string;
  caption?: string;
};

/**
 * The cover composition prints the platform and a caption, so several variants
 * can share it and still label themselves correctly.
 */
export const inputPropsFor = (
  spec: VideoSpec,
  channel: ChannelProfile,
  variant: OutputVariant,
): CompositionInput =>
  variant.composition === 'cover'
    ? {
        spec,
        channel,
        renderProfile: variant.aspect,
        platform: variant.platform,
        caption: variant.caption ?? variant.label,
      }
    : {
        spec,
        channel,
        renderProfile: variant.aspect,
        overlays: variant.overlays ?? {},
      };

export const selectFor = async ({
  serveUrl,
  spec,
  channel,
  variant,
  browser,
}: {
  serveUrl: string;
  spec: VideoSpec;
  channel: ChannelProfile;
  variant: OutputVariant;
  browser: BrowserOptions;
}) => {
  const inputProps = inputPropsFor(spec, channel, variant);
  const composition = await selectComposition({
    serveUrl,
    id: compositionId({family: variant.composition, aspect: variant.aspect}),
    inputProps,
    browserExecutable: browser.browserExecutable ?? undefined,
    chromeMode: browser.chromeMode as never,
  });
  return {composition, inputProps};
};

/** Build an artifact record from a file that has just been written. */
export const describeArtifact = ({
  variant,
  path,
  width,
  height,
  index,
  durationInFrames,
}: {
  variant: OutputVariant;
  path: string;
  width: number;
  height: number;
  index?: number;
  durationInFrames?: number;
}): ProducedArtifact => ({
  variantId: variant.id,
  kind: variant.artifact.kind,
  path,
  mimeType: variant.artifact.mimeType,
  sizeBytes: statSync(path).size,
  width,
  height,
  ...(index === undefined ? {} : {index}),
  ...(durationInFrames === undefined ? {} : {durationInFrames}),
});
