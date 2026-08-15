import {useVideoConfig} from 'remotion';
import {SAFE} from './tokens';

// Definitions live in formatDefs.ts (remotion-free, importable by the studio
// app without dragging the renderer into its bundle); re-exported here so
// composition code keeps one import site.
export {FORMATS, FORMAT_IDS} from './formatDefs';
export type {FormatDef, FormatId} from './formatDefs';
import type {FormatId} from './formatDefs';

export type Layout = {
  format: FormatId;
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isSquare: boolean;
  /** Usable content box after the safe area. */
  contentW: number;
  contentH: number;
  safe: number;
  /** Stack children vertically? True for portrait and square, false for landscape. */
  stack: boolean;
  /** How many cards fit comfortably side by side. */
  columns: number;
};

export const useLayout = (): Layout => {
  const {width, height} = useVideoConfig();
  const isPortrait = height > width;
  const isSquare = height === width;
  const isLandscape = width > height;

  return {
    format: isLandscape ? 'landscape' : isSquare ? 'square' : 'portrait',
    width,
    height,
    isPortrait,
    isLandscape,
    isSquare,
    contentW: width - SAFE * 2,
    contentH: height - SAFE * 2,
    safe: SAFE,
    stack: !isLandscape,
    columns: isLandscape ? 3 : 2,
  };
};
