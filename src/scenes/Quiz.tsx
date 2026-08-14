import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {EASE, fadeUp, pop, pulse, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {QuizScene} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const LETTERS = ['A', 'B', 'C', 'D'];

/** Default reveal point: 60% through the scene, leaving room to think. */
export const quizRevealFrame = (scene: {
  durationInFrames: number;
  revealAtFrame?: number;
}) => scene.revealAtFrame ?? Math.round(scene.durationInFrames * 0.6);

export const Quiz: React.FC<{scene: QuizScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();

  const reveal = Math.min(quizRevealFrame(scene), durationInFrames - 1);
  const optionsIn = stagger(scene.options.length - 1, 9, 14) + 18;
  const columns = layout.isLandscape
    ? Math.min(scene.options.length, 4)
    : scene.options.length === 4
      ? 2
      : 1;

  const optionAccents = ['attention', 'info', 'secondary', 'primary'] as const;

  return (
    <Frame
      kicker={scene.kicker ?? 'Quick check'}
      title={scene.question}
      accent={scene.accent ?? 'info'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: layout.isLandscape ? space.md : space.sm,
          width: layout.isLandscape ? layout.contentW * 0.9 : layout.contentW * 0.92,
        }}
      >
        {scene.options.map((option, index) => {
          const at = stagger(index, 9, 14);
          const isAnswer = index === scene.answerIndex;
          const accent = accents[isAnswer ? 'success' : optionAccents[index % 4]];
          // After the reveal, the answer lifts and the rest recede.
          const revealed = interpolate(frame, [reveal, reveal + 12], [0, 1], {
            ...clamp,
            easing: EASE,
          });
          const dimmed = isAnswer ? 1 : 1 - revealed * 0.65;
          const entry = fadeUp(frame, at, 22, 36);
          return (
            <div
              key={option.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                minHeight: layout.isLandscape ? 150 : 130,
                padding: `${space.md}px ${space.lg}px`,
                borderRadius: radius.lg,
                border: `${stroke.thin}px solid ${
                  isAnswer && revealed > 0 ? accent : color.line
                }`,
                backgroundColor:
                  isAnswer && revealed > 0 ? tint(accent, 'soft') : color.surface,
                boxShadow:
                  isAnswer && revealed > 0 ? `0 18px 60px ${accent}33` : undefined,
                opacity: entry.opacity * dimmed,
                translate: entry.translate,
                scale: String(isAnswer ? pulse(frame, reveal, 18, 1.05) : 1),
              }}
            >
              <div
                style={{
                  width: layout.isLandscape ? 64 : 58,
                  height: layout.isLandscape ? 64 : 58,
                  flexShrink: 0,
                  borderRadius: radius.pill,
                  backgroundColor:
                    isAnswer && revealed > 0 ? accent : tint(accent, 'faint'),
                  border: `${stroke.hair}px solid ${accent}99`,
                  color: isAnswer && revealed > 0 ? '#FFFFFF' : color.text,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: font.mono,
                  fontWeight: 800,
                  fontSize: type.small,
                }}
              >
                {isAnswer && revealed > 0.5 ? '✓' : LETTERS[index] ?? index + 1}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space.sm,
                  fontFamily: font.display,
                  fontWeight: 750,
                  fontSize: layout.isLandscape ? type.h3 : type.body,
                  lineHeight: 1.15,
                  color: color.text,
                  textAlign: 'left',
                }}
              >
                {option.emoji ? (
                  <span style={{fontSize: layout.isLandscape ? 56 : 48}}>
                    {option.emoji}
                  </span>
                ) : null}
                {option.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Thinking timer: drains from full width, then hands over to the reveal. */}
      <div
        style={{
          marginTop: layout.isLandscape ? space.lg : space.md,
          width: layout.isLandscape ? layout.contentW * 0.5 : layout.contentW * 0.72,
          height: 10,
          borderRadius: radius.pill,
          backgroundColor: tint(accents[scene.accent ?? 'info'], 'faint'),
          overflow: 'hidden',
          opacity: interpolate(
            frame,
            [optionsIn, optionsIn + 10, reveal - 2, reveal + 6],
            [0, 1, 1, 0],
            clamp,
          ),
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: radius.pill,
            backgroundColor: accents[scene.accent ?? 'info'],
            width: `${interpolate(frame, [optionsIn, reveal], [100, 0], clamp)}%`,
          }}
        />
      </div>

      {scene.explanation ? (
        <div
          style={{
            marginTop: space.md,
            maxWidth: layout.contentW * 0.85,
            fontFamily: font.body,
            fontWeight: 700,
            fontSize: layout.isLandscape ? type.body : type.small,
            lineHeight: 1.4,
            color: color.textDim,
            textAlign: 'center',
            ...pop(frame, reveal + 8, 22, 0.94),
          }}
        >
          {scene.explanation}
        </div>
      ) : null}
    </Frame>
  );
};
