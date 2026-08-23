/**
 * Geometry, and nothing else.
 *
 * This used to be `FormatId`, which meant three things at once: an aspect
 * ratio, a render profile, and a segment of a string-parsed composition id.
 * That conflation is why two outputs could never share dimensions. An aspect is
 * now purely a canvas size; what gets produced on that canvas is an
 * OutputVariant.
 */

export type AspectId = 'landscape' | 'portrait' | 'square' | 'carousel';

export type AspectDef = {
  id: AspectId;
  label: string;
  width: number;
  height: number;
};

export const ASPECTS: Record<AspectId, AspectDef> = {
  landscape: {id: 'landscape', label: 'Landscape 16:9', width: 1920, height: 1080},
  portrait: {id: 'portrait', label: 'Portrait 9:16', width: 1080, height: 1920},
  square: {id: 'square', label: 'Square 1:1', width: 1080, height: 1080},
  carousel: {id: 'carousel', label: 'Portrait 4:5', width: 1080, height: 1350},
};

export const ASPECT_IDS = Object.keys(ASPECTS) as AspectId[];

export const aspectFor = (id: AspectId) => {
  const aspect = ASPECTS[id];
  if (!aspect) throw new Error(`Unknown aspect "${id}".`);
  return aspect;
};

/**
 * Last-resort lookup for code that only has pixel dimensions to go on.
 * Prefer passing the AspectId through; this cannot distinguish two aspects
 * that happen to share a size.
 */
export const inferAspect = (width: number, height: number): AspectId =>
  ASPECT_IDS.find(
    (id) => ASPECTS[id].width === width && ASPECTS[id].height === height,
  ) ?? (height > width ? 'portrait' : width > height ? 'landscape' : 'square');
