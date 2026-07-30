import {AbsoluteFill, Series} from 'remotion';
import {AudioMix} from './audio/AudioMix';
import {Captions, Chrome} from './components/Chrome';
import {FontGate} from './design/FontGate';
import {useLayout} from './design/formats';
import type {FormatId} from './design/formats';
import {SCENES} from './scenes/registry';
import type {VideoSpec} from './types';
import {ChannelProvider} from './channels';
import type {ChannelProfile} from './channels';
import {useTheme} from './themes';

/**
 * Turns a spec into frames. Nothing video-specific lives here — if you find
 * yourself wanting to special-case a particular video in this file, that is a
 * sign the scene kit is missing a scene type.
 */
type VideoProps = {
  spec: VideoSpec;
  channel: ChannelProfile;
  renderProfile: FormatId;
};

const VideoBody: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const layout = useLayout();
  const {color} = useTheme();
  // Captions default on for vertical cuts, which are overwhelmingly watched muted.
  const showCaptions = spec.captions ?? !layout.isLandscape;

  return (
    <AbsoluteFill style={{backgroundColor: color.bg}}>
      <FontGate>
        <Series>
          {spec.scenes.map((scene, i) => {
            const Component = SCENES[scene.type];
            return (
              <Series.Sequence
                key={scene.id ?? `${scene.type}-${i}`}
                durationInFrames={scene.durationInFrames}
                name={scene.id ?? scene.type}
              >
                <Component scene={scene} />
                {showCaptions ? <Captions text={scene.narration} /> : null}
              </Series.Sequence>
            );
          })}
        </Series>

        <Chrome />
        <AudioMix spec={spec} />
      </FontGate>
    </AbsoluteFill>
  );
};

export const Video: React.FC<VideoProps> = ({spec, channel}) => (
  <ChannelProvider channel={channel}>
    <VideoBody spec={spec} />
  </ChannelProvider>
);
