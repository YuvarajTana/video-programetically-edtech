import type {CSSProperties, ReactNode} from 'react';
import {color, font, type} from '../design/tokens';

type P = {children: ReactNode; style?: CSSProperties; accent?: string};

const base = (extra: CSSProperties, style?: CSSProperties): CSSProperties => ({
  margin: 0,
  ...extra,
  ...style,
});

/** Small uppercase mono label that sits above a heading. */
export const Kicker: React.FC<P> = ({children, style, accent}) => (
  <div
    style={base(
      {
        fontFamily: font.mono,
        fontSize: type.micro,
        fontWeight: 700,
        letterSpacing: 7,
        textTransform: 'uppercase',
        color: accent ?? color.muted,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const Display: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.display,
        fontWeight: 700,
        fontSize: type.display,
        lineHeight: 1.02,
        letterSpacing: -1,
        color: color.text,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const H1: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.display,
        fontWeight: 700,
        fontSize: type.h1,
        lineHeight: 1.08,
        color: color.text,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const H2: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.display,
        fontWeight: 600,
        fontSize: type.h2,
        lineHeight: 1.15,
        color: color.text,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const H3: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.body,
        fontWeight: 700,
        fontSize: type.h3,
        lineHeight: 1.25,
        color: color.text,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const Body: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.body,
        fontWeight: 400,
        fontSize: type.body,
        lineHeight: 1.45,
        color: color.textDim,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const Small: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.body,
        fontWeight: 600,
        fontSize: type.small,
        lineHeight: 1.4,
        color: color.muted,
      },
      style,
    )}
  >
    {children}
  </div>
);

export const Mono: React.FC<P> = ({children, style}) => (
  <div
    style={base(
      {
        fontFamily: font.mono,
        fontWeight: 400,
        fontSize: type.small,
        lineHeight: 1.55,
        color: color.textDim,
      },
      style,
    )}
  >
    {children}
  </div>
);
