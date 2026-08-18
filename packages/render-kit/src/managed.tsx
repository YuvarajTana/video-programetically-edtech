import type {CalculateMetadataFunction} from 'remotion';
import {ASPECTS} from '@video-kit/core/output';
import type {AspectId, OverlayToggles} from '@video-kit/core/output';
import {managedDefaults} from '@video-kit/core/managed';
import type {ChannelProfile} from '@video-kit/core/channels';
import {totalFrames, type VideoSpec} from '@video-kit/core/spec';

export type {ManagedVideoInput} from '@video-kit/core/managed';
export {MANAGED_COMPOSITION_IDS, managedDefaults} from '@video-kit/core/managed';

export type VideoCompositionInput = {
  spec: VideoSpec;
  channel: ChannelProfile;
  renderProfile: AspectId;
  overlays?: OverlayToggles;
};

export type CoverCompositionInput = {
  spec: VideoSpec;
  channel: ChannelProfile;
  renderProfile: AspectId;
  platform?: string;
  caption?: string;
};

export const videoDefaults: VideoCompositionInput = {
  ...managedDefaults,
  overlays: {},
};

export const coverDefaults: CoverCompositionInput = {
  spec: managedDefaults.spec,
  channel: managedDefaults.channel,
  renderProfile: managedDefaults.renderProfile,
  platform: 'youtube',
  caption: 'Preview',
};

/** Duration follows the spec; dimensions follow the aspect the props ask for. */
export const calculateVideoMetadata: CalculateMetadataFunction<
  VideoCompositionInput
> = ({props}) => {
  const aspect = ASPECTS[props.renderProfile];
  return {
    durationInFrames: Math.max(1, totalFrames(props.spec)),
    fps: props.spec.fps ?? 30,
    width: aspect.width,
    height: aspect.height,
    props,
  };
};

/** A cover is one frame, whatever the video's length. */
export const calculateCoverMetadata: CalculateMetadataFunction<
  CoverCompositionInput
> = ({props}) => {
  const aspect = ASPECTS[props.renderProfile];
  return {
    durationInFrames: 1,
    fps: props.spec.fps ?? 30,
    width: aspect.width,
    height: aspect.height,
    props,
  };
};

/** @deprecated Use calculateVideoMetadata. */
export const calculateManagedMetadata = calculateVideoMetadata;
