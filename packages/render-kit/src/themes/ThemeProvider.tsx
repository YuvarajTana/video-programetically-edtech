import {createContext, useContext} from 'react';
import type {ReactNode} from 'react';
import {techTheme} from '@video-kit/core/themes';
import type {VideoTheme} from '@video-kit/core/themes';

const ThemeContext = createContext<VideoTheme>(techTheme);

export const ThemeProvider: React.FC<{theme: VideoTheme; children: ReactNode}> = ({
  theme,
  children,
}) => <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;

export const useTheme = () => useContext(ThemeContext);
