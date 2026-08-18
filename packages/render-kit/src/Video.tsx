import {AbsoluteFill, Series} from 'remotion';
import {AudioMix} from './audio/AudioMix';
import {Captions, Chrome} from './components/Chrome';
import {Rail} from './components/Rail';
import {FontGate} from './design/FontGate';
import {LayoutProvider, useLayout} from './design/formats';
import type {FormatId} from './design/formats';
import type {OverlayToggles} from '@video-kit/core/output';
import {SCENES} from './scenes/registry';
import type {VideoSpec} from '@video-kit/core/spec';
import {ChannelProvider} from './channels';
import type {ChannelProfile} from './channels';
import {useTheme} from './themes';
import {isIndicLocale, languageFor} from '@video-kit/core/languages';
import {useResolvedMotionCanvasSpec, useWordTimings} from './timing/wordTimings';

/**
 * Turns a spec into frames. Nothing video-specific lives here — if you find
 * yourself wanting to special-case a particular video in this file, that is a
 * sign the scene kit is missing a scene type.
 */
type VideoProps = {
  spec: VideoSpec;
  channel: ChannelProfile;
  renderProfile: FormatId;
  /**
   * Overlays the requesting output variant suppresses. A poster wants no
   * captions or progress bar; a silent loop wants no audio.
   */
  overlays?: OverlayToggles;
};

const VideoBody: React.FC<{spec: VideoSpec; overlays: OverlayToggles}> = ({
  spec,
  overlays,
}) => {
  const layout = useLayout();
  const {color} = useTheme();
  const timings = useWordTimings(spec.captionTimings);
  const timedSpec = useResolvedMotionCanvasSpec(spec, timings);
  // Captions default on for vertical cuts, which are overwhelmingly watched muted.
  const showCaptions = overlays.captions ?? spec.captions ?? !layout.isLandscape;
  const showRail = overlays.rail ?? true;
  const showChrome = overlays.chrome ?? true;
  const withAudio = overlays.audio ?? true;

  return (
    <AbsoluteFill
      lang={spec.editorial?.language ?? 'en-US'}
      style={{backgroundColor: color.bg}}
    >
      {isIndicLocale(spec.editorial?.language ?? 'en-US') ? (
        <style>
          {`[lang]:not([lang^="en"]) * { letter-spacing: normal !important; text-transform: none !important; }`}
        </style>
      ) : null}
      <FontGate>
        <Series>
          {timedSpec.scenes.map((scene, i) => {
            const Component = SCENES[scene.type];
            return (
              <Series.Sequence
                key={scene.id ?? `${scene.type}-${i}`}
                durationInFrames={scene.durationInFrames}
                name={scene.id ?? scene.type}
              >
                <Component scene={scene} />
              </Series.Sequence>
            );
          })}
        </Series>

        {showCaptions ? <Captions spec={timedSpec} /> : null}
        {showRail ? <Rail spec={timedSpec} /> : null}
        {showChrome ? <Chrome /> : null}
        {withAudio ? <AudioMix spec={timedSpec} /> : null}
      </FontGate>
    </AbsoluteFill>
  );
};

export const Video: React.FC<VideoProps> = ({
  spec,
  channel,
  renderProfile,
  overlays = {},
}) => {
  const locale = spec.editorial?.language ?? 'en-US';
  const language = languageFor(locale);
  const localizedChannel = isIndicLocale(locale)
    ? {
        ...channel,
        theme: {
          ...channel.theme,
          font: {
            ...channel.theme.font,
            display: language.fontFamily,
            body: language.fontFamily,
          },
        },
      }
    : channel;
  return (
    <ChannelProvider channel={localizedChannel}>
      <LayoutProvider aspect={renderProfile}>
        <VideoBody spec={spec} overlays={overlays} />
      </LayoutProvider>
    </ChannelProvider>
  );
};
