import {useVideoConfig} from 'remotion';
import {SAFE} from './tokens';

export type FormatId = 'landscape' | 'portrait' | 'square';

export type FormatDef = {
  id: FormatId;
  label: string;
  width: number;
  height: number;
  /** Where this cut is destined, used by the render script for filenames. */
  target: string;
};

export const FORMATS: Record<FormatId, FormatDef> = {
  landscape: {id: 'landscape', label: 'Landscape 16:9', width: 1920, height: 1080, target: 'landscape'},
  portrait: {id: 'portrait', label: 'Portrait 9:16', width: 1080, height: 1920, target: 'portrait'},
  square: {id: 'square', label: 'Square 1:1', width: 1080, height: 1080, target: 'square'},
};

export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

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
