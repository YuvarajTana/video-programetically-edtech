import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {space} from '../design/tokens';
import {useTheme} from '../themes';
import type {Accent} from '../themes';
import {fadeUp, sceneFade} from '../design/anim';
import {useLayout} from '../design/formats';
import {H2, Kicker} from './Text';

/**
 * Scene chrome. Every scene renders inside one of these, which is what makes an
 * infra explainer and a sorting animation feel like the same channel: identical
 * safe area, identical header rhythm, identical fade in and out of the cut.
 */
export const Frame: React.FC<{
  children: ReactNode;
  kicker?: string;
  title?: string;
  accent?: Accent;
  /** Vertical placement of the body content within the frame. */
  align?: 'center' | 'top';
  /** Suppress the automatic scene fade, e.g. for the first scene of a video. */
  noFade?: boolean;
  style?: CSSProperties;
}> = ({children, kicker, title, accent = 'primary', align = 'center', noFade, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const layout = useLayout();
  const {accents, color, frameBackground} = useTheme();
  const hasHeader = Boolean(kicker || title);

  return (
    <AbsoluteFill
      name="Frame"
      style={{
        backgroundColor: color.bg,
        padding: layout.safe,
        opacity: noFade ? 1 : sceneFade(frame, durationInFrames),
      }}
    >
      <AbsoluteFill
        style={{
          background: frameBackground,
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: hasHeader ? 'flex-start' : 'center',
        }}
      >
        {hasHeader ? (
          <div
            style={{
              textAlign: 'center',
              marginBottom: layout.isLandscape ? space.lg : space.xl,
              ...fadeUp(frame, 0, 20, 24),
            }}
          >
            {kicker ? <Kicker accent={accents[accent]}>{kicker}</Kicker> : null}
            {title ? <H2 style={{marginTop: space.sm}}>{title}</H2> : null}
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
            minHeight: 0,
            ...style,
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
