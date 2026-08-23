import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Frame} from '../components/Frame';
import {EASE, fadeUp, stagger} from '../design/anim';
import {useLayout} from '../design/formats';
import {radius, space, stroke, tint, type} from '@video-kit/core/design/tokens';
import {useTheme} from '../themes';
import type {TokensScene} from '@video-kit/core/spec';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Default flip point: 45% through the scene. Mirrored by validation. */
export const tokensFlipFrame = (scene: {
  durationInFrames: number;
  flipAtFrame?: number;
}) => scene.flipAtFrame ?? Math.round(scene.durationInFrames * 0.45);

/**
 * Text chips that flip into their token ids — the tokenization mechanic.
 * Each chip flips slightly after its neighbour so the encoding reads as a
 * wave travelling through the sentence.
 */
export const Tokens: React.FC<{scene: TokensScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, font} = useTheme();
  const flipBase = Math.min(tokensFlipFrame(scene), durationInFrames - 1);
  const accent = accents[scene.accent ?? 'info'];

  return (
    <Frame
      kicker={scene.kicker}
      title={scene.title}
      accent={scene.accent ?? 'info'}
      style={{paddingBottom: layout.isPortrait ? 210 : 0}}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: layout.isLandscape ? space.md : space.sm,
          maxWidth: layout.isLandscape ? layout.contentW * 0.8 : layout.contentW * 0.94,
        }}
      >
        {scene.items.map((item, index) => {
          const flipAt = stagger(index, 5, flipBase);
          // The chip squashes to zero height mid-flip, then the id springs out.
          const flip = interpolate(frame, [flipAt, flipAt + 12], [0, 1], {
            ...clamp,
            easing: EASE,
          });
          const squash = Math.abs(1 - flip * 2); // 1 → 0 → 1
          const flipped = flip >= 0.5;
          return (
            <div
              key={`${item.text}-${index}`}
              style={{
                padding: layout.isLandscape
                  ? `${space.sm}px ${space.lg}px`
                  : `${space.sm}px ${space.md}px`,
                borderRadius: radius.md,
                border: `${stroke.hair}px solid ${flipped ? accent : color.line}`,
                backgroundColor: flipped ? tint(accent, 'soft') : color.surface,
                fontFamily: font.mono,
                fontWeight: 800,
                fontSize: layout.isLandscape ? type.h3 : type.body,
                lineHeight: 1.1,
                color: flipped ? accent : color.text,
                transform: `scaleY(${Math.max(squash, 0.05)})`,
                boxShadow: flipped ? `0 10px 40px ${accent}26` : undefined,
                ...fadeUp(frame, stagger(index, 6, 10), 18, 22),
              }}
            >
              {flipped ? item.id : item.text}
            </div>
          );
        })}
      </div>

      {scene.footnote ? (
        <div
          style={{
            marginTop: space.xl,
            fontFamily: font.body,
            fontWeight: 650,
            fontSize: layout.isLandscape ? type.body : type.small,
            color: color.textDim,
            textAlign: 'center',
            ...fadeUp(frame, flipBase + scene.items.length * 5 + 14, 20, 20),
          }}
        >
          {scene.footnote}
        </div>
      ) : null}
    </Frame>
  );
};
