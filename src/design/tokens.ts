/**
 * Structural tokens shared by every channel.
 *
 * Colors and font roles live in src/themes. Values here are expressed against
 * a 1080px short edge, so type and spacing stay stable across aspect ratios.
 */

export type {Accent} from '../themes/types';

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
