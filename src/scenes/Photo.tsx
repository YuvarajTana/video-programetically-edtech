import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useTheme} from '../themes';
import type {ImageScene} from '../types';
import {MediaOverlay, useMediaFade} from './mediaChrome';

/**
 * A full-bleed licensed still. Cover fit gets a slow push-in by default so
 * the frame never sits dead; contain letterboxes on the deep background.
 */
export const Photo: React.FC<{scene: ImageScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const {color} = useTheme();
  const fit = scene.image.fit ?? 'cover';
  const kenBurns = scene.image.kenBurns ?? fit === 'cover';
  const zoom = kenBurns
    ? interpolate(frame, [0, durationInFrames], [1, 1.09])
    : 1;

  return (
    <AbsoluteFill style={{backgroundColor: color.bgDeep, opacity: useMediaFade()}}>
      <Img
        src={staticFile(scene.image.src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          transform: `scale(${zoom})`,
        }}
      />
      <MediaOverlay
        kicker={scene.kicker}
        title={scene.title}
        caption={scene.caption}
        credit={scene.hideCredit ? undefined : scene.image.credit}
        accent={scene.accent}
      />
    </AbsoluteFill>
  );
};
