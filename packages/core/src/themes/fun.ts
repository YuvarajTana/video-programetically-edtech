import type {VideoTheme} from './types';

export const funTheme: VideoTheme = {
  id: 'fun',
  color: {
    bg: '#120A2A',
    bgDeep: '#090416',
    surface: '#24124A',
    surfaceHi: '#321966',
    line: '#54318A',
    lineHi: '#7B4CC4',
    text: '#FFF9FF',
    textDim: '#DACDF1',
    muted: '#A895C8',
  },
  accents: {
    primary: '#FF4FD8',
    secondary: '#8B5CF6',
    success: '#4FFFB0',
    attention: '#FFE45E',
    info: '#45D6FF',
  },
  font: {
    display: "'Hanken Grotesk', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari', system-ui, sans-serif",
    body: "'Hanken Grotesk', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari', ui-monospace, monospace",
  },
  frameBackground:
    'radial-gradient(100% 80% at 50% 0%, rgba(255,79,216,0.20) 0%, transparent 58%), radial-gradient(70% 55% at 100% 100%, rgba(69,214,255,0.14) 0%, transparent 70%)',
  chrome: {progressHeight: 10, progressOpacity: 1, captionRadius: 999},
};
