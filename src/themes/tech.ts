import type {VideoTheme} from './types';

export const techTheme: VideoTheme = {
  id: 'tech',
  color: {
    bg: '#0a0e0c',
    bgDeep: '#060907',
    surface: '#141f1a',
    surfaceHi: '#1b2a24',
    line: '#26362f',
    lineHi: '#33473f',
    text: '#E9E7E2',
    textDim: '#B6BEB9',
    muted: '#7E8C86',
  },
  accents: {
    primary: '#F5A524',
    secondary: '#A78BFA',
    success: '#2DD4BF',
    attention: '#FF6B5B',
    info: '#A78BFA',
  },
  font: {
    display: "'Fraunces', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari', Georgia, serif",
    body: "'Hanken Grotesk', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari', ui-monospace, monospace",
  },
  frameBackground:
    'radial-gradient(120% 80% at 50% 0%, rgba(20,31,26,0.34) 0%, transparent 60%)',
  chrome: {progressHeight: 5, progressOpacity: 0.85, captionRadius: 14},
};
