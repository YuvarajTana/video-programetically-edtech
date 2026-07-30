import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {space, tint, type} from '../design/tokens';
import {useLayout} from '../design/formats';
import {useChannel} from '../channels';
import {useTheme} from '../themes';

/**
 * Channel furniture that persists across every scene: the handle watermark and
 * a hairline progress bar. Deliberately quiet — it should register without ever
 * competing with the content.
 */
export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const channel = useChannel();
  const {accents, chrome, color, font} = useTheme();
  const pct = Math.min(1, frame / Math.max(1, durationInFrames - 1));

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {channel.handle ? (
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
          {channel.handle}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: chrome.progressHeight,
          width: `${pct * 100}%`,
          backgroundColor: accents.primary,
          opacity: chrome.progressOpacity,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Burned-in caption bar. Most portrait social video is watched muted, so the narration line
 * doubles as the on-screen caption rather than being VO-only.
 */
export const Captions: React.FC<{text?: string}> = ({text}) => {
  const layout = useLayout();
  const {chrome, color, font} = useTheme();
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
          borderRadius: chrome.captionRadius,
          backgroundColor: tint(color.bgDeep, 'strong'),
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
