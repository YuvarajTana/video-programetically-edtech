import type {CSSProperties, ReactNode} from 'react';
import {accents, color, radius, space, stroke, tint} from '../design/tokens';
import type {Accent} from '../design/tokens';

/**
 * The one surface in the system. Everything that needs to sit above the
 * background uses this, so panel treatment never drifts between videos.
 */
export const Card: React.FC<{
  children: ReactNode;
  accent?: Accent;
  /** Which edge carries the accent stripe. 'none' for a plain panel. */
  edge?: 'left' | 'top' | 'none';
  style?: CSSProperties;
  glow?: boolean;
}> = ({children, accent, edge = 'none', style, glow}) => {
  const a = accent ? accents[accent] : undefined;
  return (
    <div
      style={{
        backgroundColor: color.surface,
        border: `${stroke.hair}px solid ${color.line}`,
        borderLeft:
          edge === 'left' && a ? `${stroke.thick}px solid ${a}` : undefined,
        borderTop: edge === 'top' && a ? `${stroke.thick}px solid ${a}` : undefined,
        borderRadius: radius.lg,
        padding: `${space.lg}px ${space.xl}px`,
        boxShadow: glow && a ? `0 0 60px ${tint(a, 'faint')}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
