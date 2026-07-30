import type {VideoTheme} from './types';

export const learnTheme: VideoTheme = {
  id: 'learn',
  color: {
    bg: '#FFF8EA',
    bgDeep: '#FFF0CF',
    surface: '#FFFFFF',
    surfaceHi: '#FFF2D6',
    line: '#F1D49A',
    lineHi: '#D99B2B',
    text: '#24324A',
    textDim: '#52627B',
    muted: '#78849A',
  },
  accents: {
    primary: '#FF7043',
    secondary: '#7C5CFC',
    success: '#18A979',
    attention: '#F5A524',
    info: '#2F80ED',
  },
  font: {
    display: "'Hanken Grotesk', system-ui, sans-serif",
    body: "'Hanken Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  frameBackground:
    'radial-gradient(110% 75% at 50% 0%, rgba(255,190,92,0.24) 0%, transparent 64%)',
  chrome: {progressHeight: 8, progressOpacity: 0.9, captionRadius: 24},
};
