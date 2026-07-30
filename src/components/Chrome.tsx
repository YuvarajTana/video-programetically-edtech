import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {color, font, space, tint, type} from '../design/tokens';
import {useLayout} from '../design/formats';

/**
 * Channel furniture that persists across every scene: the handle watermark and
 * a hairline progress bar. Deliberately quiet — it should register without ever
 * competing with the content.
 */
export const Chrome: React.FC<{handle?: string}> = ({handle}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const pct = Math.min(1, frame / Math.max(1, durationInFrames - 1));

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {handle ? (
        <div
          style={{
            position: 'absolute',
            top: layout.safe * 0.5,
            right: layout.safe * 0.6,
            fontFamily: font.mono,
            fontSize: type.nano,
            letterSpacing: 3,
            color: tint(color.muted, 'strong'),
            textTransform: 'uppercase',
          }}
        >
          {handle}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 5,
          width: `${pct * 100}%`,
          backgroundColor: color.amber,
          opacity: 0.85,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Burned-in caption bar. Most reels are watched muted, so the narration line
 * doubles as the on-screen caption rather than being VO-only.
 */
export const Captions: React.FC<{text?: string}> = ({text}) => {
  const layout = useLayout();
  if (!text) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: layout.safe,
        right: layout.safe,
        bottom: layout.safe * 0.9,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: layout.isLandscape ? layout.contentW * 0.7 : layout.contentW,
          padding: `${space.sm}px ${space.lg}px`,
          borderRadius: 14,
          backgroundColor: `${color.bgDeep}D9`,
          border: `2px solid ${color.line}`,
          fontFamily: font.body,
          fontWeight: 600,
          fontSize: type.small,
          lineHeight: 1.35,
          color: color.text,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};
