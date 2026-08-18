import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {EASE} from '../design/anim';
import {useLayout} from '../design/formats';
import {type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {KineticBeat, KineticTextScene} from '@video-kit/core/spec';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Splits the scene into one window per beat. Beats with an explicit
 * holdFrames keep it; the rest share the remaining frames evenly. Mirrored by
 * the validator so authoring mistakes surface before a render.
 */
export const beatWindows = (
  beats: KineticBeat[],
  durationInFrames: number,
): {start: number; end: number}[] => {
  const explicit = beats.reduce((n, beat) => n + (beat.holdFrames ?? 0), 0);
  const flexible = beats.filter((beat) => beat.holdFrames === undefined).length;
  const share = flexible
    ? Math.max((durationInFrames - explicit) / flexible, 1)
    : 0;
  let at = 0;
  return beats.map((beat) => {
    const start = at;
    at += beat.holdFrames ?? share;
    return {start, end: at};
  });
};

/** Bigger text for shorter lines, so every beat fills the frame. */
const beatFontSize = (text: string, isLandscape: boolean) => {
  const scale = isLandscape ? 1.25 : 1;
  if (text.length <= 5) return type.display * 1.9 * scale;
  if (text.length <= 10) return type.display * 1.4 * scale;
  if (text.length <= 20) return type.display * scale;
  return type.h1 * scale;
};

/**
 * One phrase after another, each punching into the frame. Timing is the whole
 * design: keep beats short and let music or narration land on the cuts.
 */
export const KineticText: React.FC<{scene: KineticTextScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const windows = beatWindows(scene.beats, durationInFrames);

  return (
    <Frame accent={scene.accent ?? 'primary'}>
      {scene.beats.map((beat, index) => {
        const {start, end} = windows[index];
        const isLast = index === scene.beats.length - 1;
        if (frame < start - 2 || (!isLast && frame >= end + 2)) return null;

        // An explicit beat accent always colors the text; otherwise beats
        // alternate between plain ink and the scene accent for rhythm.
        const accent = accents[beat.accent ?? scene.accent ?? 'primary'];
        const inkColor = beat.accent
          ? accent
          : index % 2
            ? accent
            : color.text;
        const enter = interpolate(frame, [start, start + 7], [0, 1], {
          ...clamp,
          easing: EASE,
        });
        // The last beat holds; earlier beats snap out just before the next one.
        const exit = isLast
          ? 1
          : interpolate(frame, [end - 4, end], [1, 0], clamp);
        const punch = interpolate(enter, [0, 1], [0.55, 1]);
        const rotate = interpolate(enter, [0, 1], [index % 2 ? 3 : -3, 0]);

        return (
          <div
            key={`${index}-${beat.text}`}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: `0 ${layout.safe}px`,
              opacity: enter * exit,
            }}
          >
            <div
              style={{
                fontFamily: font.display,
                fontWeight: 800,
                fontSize: beatFontSize(beat.text, layout.isLandscape),
                lineHeight: 1.02,
                letterSpacing: -2,
                textAlign: 'center',
                textTransform: 'uppercase',
                color: inkColor,
                textShadow: inkColor === color.text ? undefined : `0 0 80px ${accent}55`,
                scale: String(punch * (isLast ? 1 : interpolate(exit, [0, 1], [1.08, 1]))),
                rotate: `${rotate}deg`,
              }}
            >
              {beat.text}
            </div>
          </div>
        );
      })}
    </Frame>
  );
};
