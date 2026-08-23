import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {EASE, pop} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {CountdownScene} from '@video-kit/core/spec';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Frames reserved for the reveal; the numbers split the rest. */
export const countdownRevealFrames = (scene: {
  durationInFrames: number;
  revealFrames?: number;
}) => scene.revealFrames ?? Math.round(scene.durationInFrames * 0.4);

/**
 * 3… 2… 1… and the answer. Each number punches in and shrinks away as an
 * expanding ring marks the tick, so the beat is visible even without sound.
 */
export const Countdown: React.FC<{scene: CountdownScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const revealFrames = Math.min(countdownRevealFrames(scene), durationInFrames - 1);
  const countFrames = durationInFrames - revealFrames;
  const perNumber = countFrames / Math.max(scene.from, 1);
  const revealAt = countFrames;
  const accent = accents[scene.accent ?? 'attention'];
  const numberSize = layout.isLandscape ? type.display * 3 : type.display * 2.6;

  return (
    <Frame kicker={scene.kicker} accent={scene.accent ?? 'attention'}>
      {Array.from({length: scene.from}, (_, index) => {
        const value = scene.from - index;
        const start = index * perNumber;
        const end = start + perNumber;
        if (frame < start || frame >= end + 2) return null;
        const local = frame - start;
        const enter = interpolate(local, [0, 6], [0, 1], {...clamp, easing: EASE});
        const shrink = interpolate(local, [0, perNumber], [1, 0.82], {
          ...clamp,
          easing: EASE,
        });
        const ring = interpolate(local, [0, perNumber * 0.9], [0, 1], clamp);
        return (
          <div
            key={value}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: numberSize * (0.9 + ring * 0.9),
                height: numberSize * (0.9 + ring * 0.9),
                borderRadius: radius.pill,
                border: `${stroke.thin}px solid ${accent}`,
                opacity: (1 - ring) * 0.5 * enter,
              }}
            />
            <div
              style={{
                fontFamily: font.display,
                fontWeight: 800,
                fontSize: numberSize,
                lineHeight: 1,
                color: value === 1 ? accent : color.text,
                opacity: enter,
                scale: String(interpolate(enter, [0, 1], [1.5, 1]) * shrink),
              }}
            >
              {value}
            </div>
          </div>
        );
      })}

      {frame >= revealAt ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: `0 ${layout.safe}px`,
          }}
        >
          <div style={{textAlign: 'center', ...pop(frame, revealAt, 16, 0.6)}}>
            {scene.revealEmoji ? (
              <div style={{fontSize: layout.isLandscape ? 190 : 170, lineHeight: 1.1}}>
                {scene.revealEmoji}
              </div>
            ) : null}
            <div
              style={{
                marginTop: scene.revealEmoji ? space.md : 0,
                fontFamily: font.display,
                fontWeight: 800,
                fontSize: layout.isLandscape ? type.display * 1.25 : type.display,
                lineHeight: 1.05,
                letterSpacing: -1,
                textTransform: 'uppercase',
                color: accent,
                textShadow: `0 0 90px ${accent}55`,
              }}
            >
              {scene.reveal}
            </div>
          </div>
        </div>
      ) : null}
    </Frame>
  );
};
