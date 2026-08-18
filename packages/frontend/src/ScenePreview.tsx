import {Player} from '@remotion/player';
import type {FormatDef} from '@video-kit/core/design/formats';
import {totalFrames} from '@video-kit/core/spec';
import {Video} from '@video-kit/render-kit';

type VideoProps = Parameters<typeof Video>[0];

/**
 * The live Remotion preview. Kept in its own module and loaded lazily —
 * @remotion/player plus the whole scene kit is the heaviest part of the
 * studio bundle, and only the editor view needs it.
 */
const ScenePreview: React.FC<{
  spec: unknown;
  channel: VideoProps['channel'];
  profile: VideoProps['renderProfile'];
  format: FormatDef;
  fps: number;
}> = ({spec, channel, profile, format, fps}) => (
  <Player
    component={Video}
    inputProps={{
      spec: spec as VideoProps['spec'],
      channel,
      renderProfile: profile,
    }}
    durationInFrames={Math.max(
      1,
      totalFrames(spec as Parameters<typeof totalFrames>[0]),
    )}
    fps={fps}
    compositionWidth={format.width}
    compositionHeight={format.height}
    controls
    style={{width: '100%', height: '100%'}}
  />
);

export default ScenePreview;
