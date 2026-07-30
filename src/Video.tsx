import {AbsoluteFill, Audio, Series, staticFile} from 'remotion';
import {Captions, Chrome} from './components/Chrome';
import {FontGate} from './design/FontGate';
import {color} from './design/tokens';
import {useLayout} from './design/formats';
import {SCENES} from './scenes/registry';
import type {VideoSpec} from './types';

/**
 * Turns a spec into frames. Nothing video-specific lives here — if you find
 * yourself wanting to special-case a particular video in this file, that is a
 * sign the scene kit is missing a scene type.
 */
export const Video: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const layout = useLayout();
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

        <Chrome handle={spec.handle} />
        {spec.audio ? <Audio src={staticFile(spec.audio)} /> : null}
      </FontGate>
    </AbsoluteFill>
  );
};
