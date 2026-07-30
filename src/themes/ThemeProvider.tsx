import {createContext, useContext} from 'react';
import type {ReactNode} from 'react';
import {techTheme} from './tech';
import type {VideoTheme} from './types';

const ThemeContext = createContext<VideoTheme>(techTheme);

export const ThemeProvider: React.FC<{theme: VideoTheme; children: ReactNode}> = ({
  theme,
  children,
}) => <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;

export const useTheme = () => useContext(ThemeContext);
