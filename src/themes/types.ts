export type Accent = 'primary' | 'secondary' | 'success' | 'attention' | 'info';

export type ThemeColors = {
  bg: string;
  bgDeep: string;
  surface: string;
  surfaceHi: string;
  line: string;
  lineHi: string;
  text: string;
  textDim: string;
  muted: string;
};

export type ThemeFonts = {
  display: string;
  body: string;
  mono: string;
};

export type VideoTheme = {
  id: string;
  color: ThemeColors;
  accents: Record<Accent, string>;
  font: ThemeFonts;
  frameBackground: string;
  chrome: {
    progressHeight: number;
    progressOpacity: number;
    captionRadius: number;
  };
};
