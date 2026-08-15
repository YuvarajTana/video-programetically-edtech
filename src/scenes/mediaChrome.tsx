import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {fadeUp, sceneFade} from '../design/anim';
import {useLayout} from '../design/formats';
import {space, type} from '../design/tokens';
import {useTheme} from '../themes';
import type {Accent} from '../themes';

/**
 * Shared dressing for full-bleed media scenes: a bottom scrim so text stays
 * readable on any footage, kicker/title/caption, and an automatic credit
 * line — licensed media is always attributed on frame unless the spec
 * explicitly opts out (the credit still ships in package metadata).
 */
export const MediaOverlay: React.FC<{
  kicker?: string;
  title?: string;
  caption?: string;
  credit?: string;
  accent?: Accent;
}> = ({kicker, title, caption, credit, accent = 'primary'}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const {accents, font} = useTheme();
  const hasText = Boolean(kicker || title || caption);

  return (
    <>
      {hasText ? (
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.32) 18%, transparent 38%)',
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: layout.safe,
          right: layout.safe,
          bottom: layout.isPortrait ? 230 : layout.safe + space.md,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: font.mono,
              fontWeight: 800,
              fontSize: type.micro,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: accents[accent],
              ...fadeUp(frame, 4, 18, 14),
            }}
          >
            {kicker}
          </div>
        ) : null}
        {title ? (
          <div
            style={{
              marginTop: kicker ? space.xs : 0,
              fontFamily: font.display,
              fontWeight: 800,
              fontSize: layout.isLandscape ? type.h1 : type.h2,
              lineHeight: 1.05,
              color: '#FFFFFF',
              textShadow: '0 2px 24px rgba(0,0,0,0.55)',
              ...fadeUp(frame, 8, 20, 20),
            }}
          >
            {title}
          </div>
        ) : null}
        {caption ? (
          <div
            style={{
              marginTop: space.sm,
              maxWidth: layout.isLandscape ? layout.contentW * 0.62 : undefined,
              fontFamily: font.body,
              fontWeight: 650,
              fontSize: layout.isLandscape ? type.body : type.small,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.88)',
              textShadow: '0 2px 18px rgba(0,0,0,0.5)',
              ...fadeUp(frame, 14, 20, 18),
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>

      {credit ? (
        <div
          style={{
            position: 'absolute',
            right: layout.safe,
            bottom: layout.isPortrait ? 190 : layout.safe - space.md,
            fontFamily: font.mono,
            fontWeight: 700,
            fontSize: type.nano,
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.62)',
            textShadow: '0 1px 10px rgba(0,0,0,0.6)',
          }}
        >
          {credit}
        </div>
      ) : null}
    </>
  );
};

/** Scene-level fade, matching what <Frame> applies to non-media scenes. */
export const useMediaFade = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return sceneFade(frame, durationInFrames);
};
