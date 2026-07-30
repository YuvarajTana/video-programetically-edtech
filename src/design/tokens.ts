/**
 * The AIDataDynamics design language.
 *
 * Every value here is expressed against a 1080px short edge. All three delivery
 * formats (YouTube 1920x1080, Reel 1080x1920, Square 1080x1080) share that short
 * edge, so type and spacing stay identical across formats and only the *layout
 * direction* changes. Never hardcode a size in a scene — pull it from here.
 */

export const color = {
  bg: '#0a0e0c',
  bgDeep: '#060907',
  surface: '#141f1a',
  surfaceHi: '#1b2a24',
  line: '#26362f',
  lineHi: '#33473f',
  text: '#E9E7E2',
  textDim: '#B6BEB9',
  muted: '#7E8C86',

  amber: '#F5A524',
  teal: '#2DD4BF',
  coral: '#FF6B5B',
  violet: '#A78BFA',
} as const;

export type Accent = 'amber' | 'teal' | 'coral' | 'violet';

export const accents: Record<Accent, string> = {
  amber: color.amber,
  teal: color.teal,
  coral: color.coral,
  violet: color.violet,
};

/** Semantic roles so scenes never pick a colour arbitrarily. */
export const role = {
  primary: 'amber' as Accent,
  success: 'teal' as Accent,
  danger: 'coral' as Accent,
  info: 'violet' as Accent,
};

export const font = {
  display: "'Fraunces', Georgia, serif",
  body: "'Hanken Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

/** Type scale, in px on a 1080 short edge. */
export const type = {
  display: 118,
  h1: 84,
  h2: 64,
  h3: 50,
  body: 40,
  small: 32,
  micro: 26,
  nano: 22,
} as const;

/** Spacing scale, in px on a 1080 short edge. */
export const space = {
  xs: 8,
  sm: 14,
  md: 22,
  lg: 34,
  xl: 52,
  xxl: 78,
  xxxl: 112,
} as const;

export const radius = {sm: 10, md: 18, lg: 26, xl: 34, pill: 999} as const;

/** Distance from the frame edge that content must never cross. */
export const SAFE = 80;

export const stroke = {hair: 2, thin: 3, thick: 8} as const;

/** Alpha suffixes for 8-digit hex, so tints stay consistent. */
export const alpha = {
  ghost: '0F',
  faint: '1A',
  soft: '26',
  mid: '55',
  strong: '99',
} as const;

export const tint = (hex: string, a: keyof typeof alpha) => `${hex}${alpha[a]}`;

export const glow = (hex: string) => `0 0 48px ${hex}33`;
