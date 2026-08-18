import type {CalculateMetadataFunction} from 'remotion';
import {FORMATS} from '@video-kit/core/design/formats';
import {totalFrames} from '@video-kit/core/spec';
import type {ManagedVideoInput} from '@video-kit/core/managed';

export type {ManagedVideoInput} from '@video-kit/core/managed';
export {MANAGED_COMPOSITION_IDS, managedDefaults} from '@video-kit/core/managed';

export const calculateManagedMetadata: CalculateMetadataFunction<
  ManagedVideoInput
> = ({props}) => {
  const format = FORMATS[props.renderProfile];
  return {
    durationInFrames: Math.max(1, totalFrames(props.spec)),
    fps: props.spec.fps ?? 30,
    width: format.width,
    height: format.height,
    props,
  };
};
