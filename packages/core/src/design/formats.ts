/**
 * Render-profile definitions, kept free of remotion imports so browser code
 * (the studio app) can read formats without pulling the renderer into its
 * main bundle. The layout hook that consumes these lives in ./formats.
 */

export type FormatId = 'landscape' | 'portrait' | 'square' | 'carousel';

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
  carousel: {id: 'carousel', label: 'Carousel 4:5', width: 1080, height: 1350, target: 'carousel'},
};

export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];
