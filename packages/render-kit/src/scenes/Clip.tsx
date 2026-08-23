import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {useTheme} from '../themes';
import type {VideoClipScene} from '@video-kit/core/spec';
import {MediaOverlay, useMediaFade} from './mediaChrome';

/**
 * Licensed footage inside the normal scene flow. Muted by default — the
 * narration and soundtrack own the mix; opt into clip audio deliberately.
 */
export const Clip: React.FC<{scene: VideoClipScene}> = ({scene}) => {
  const {color} = useTheme();
  const muted = scene.clip.muted ?? true;

  return (
    <AbsoluteFill style={{backgroundColor: color.bgDeep, opacity: useMediaFade()}}>
      <OffthreadVideo
        src={staticFile(scene.clip.src)}
        trimBefore={scene.clip.trimBefore}
        muted={muted}
        volume={muted ? 0 : (scene.clip.volume ?? 1)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: scene.clip.fit ?? 'cover',
        }}
      />
      <MediaOverlay
        kicker={scene.kicker}
        title={scene.title}
        caption={scene.caption}
        credit={scene.hideCredit ? undefined : scene.clip.credit}
        accent={scene.accent}
      />
    </AbsoluteFill>
  );
};
