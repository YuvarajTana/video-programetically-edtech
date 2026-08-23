import {Audio, Sequence, staticFile} from 'remotion';
import type {VideoSpec} from '@video-kit/core/spec';
import {
  audioMixDefaults,
  duckingGainAtFrame,
  musicFadeAtFrame,
} from './mix';

export const AudioMix: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const soundtrack = spec.soundtrack;
  const {endFrame, narration, ducking} = audioMixDefaults(spec);
  const music = soundtrack?.music;

  return (
    <>
      {spec.audio ? (
        <Audio name="Voiceover" src={staticFile(spec.audio)} />
      ) : null}

      {music ? (
        <Sequence
          from={music.startFrame ?? 0}
          durationInFrames={endFrame - (music.startFrame ?? 0)}
          name="Background music"
        >
          <Audio
            src={staticFile(music.src)}
            trimBefore={music.trimBefore}
            loop={music.loop ?? true}
            volume={(relativeFrame) => {
              const frame = relativeFrame + (music.startFrame ?? 0);
              const fade = musicFadeAtFrame({
                frame,
                startFrame: music.startFrame ?? 0,
                endFrame,
                fadeInFrames: music.fadeInFrames ?? 15,
                fadeOutFrames: music.fadeOutFrames ?? 30,
              });
              const duck =
                spec.audio && narration.length
                  ? duckingGainAtFrame({
                      frame,
                      ranges: narration,
                      ...ducking,
                    })
                  : 1;
              return (music.volume ?? 0.16) * fade * duck;
            }}
          />
        </Sequence>
      ) : null}

      {(soundtrack?.effects ?? []).map((effect, index) => (
        <Sequence
          key={`${effect.src}-${effect.startFrame}-${index}`}
          from={effect.startFrame}
          durationInFrames={
            effect.durationInFrames ?? endFrame - effect.startFrame
          }
          name={`SFX ${index + 1}`}
        >
          <Audio
            src={staticFile(effect.src)}
            trimBefore={effect.trimBefore}
            volume={effect.volume ?? 0.7}
          />
        </Sequence>
      ))}
    </>
  );
};
