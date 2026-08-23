import {ASPECT_IDS, type AspectId} from './aspects';
import type {CompositionFamily} from './types';

/**
 * Composition ids used to be parsed out of strings — three segments meant a
 * video, four ending in "cover" meant a cover — so every consumer had to agree
 * on a shape nothing enforced. They are built and read through this pair
 * instead, and the grid is small and fixed: one per family per aspect.
 */
export type CompositionId = `${CompositionFamily}--${AspectId}`;

const FAMILIES: CompositionFamily[] = ['video', 'cover'];

export const compositionId = ({
  family,
  aspect,
}: {
  family: CompositionFamily;
  aspect: AspectId;
}): CompositionId => `${family}--${aspect}`;

export const parseCompositionId = (
  id: string,
): {family: CompositionFamily; aspect: AspectId} | null => {
  const [family, aspect] = id.split('--');
  if (!FAMILIES.includes(family as CompositionFamily)) return null;
  if (!ASPECT_IDS.includes(aspect as AspectId)) return null;
  return {family: family as CompositionFamily, aspect: aspect as AspectId};
};

export const ALL_COMPOSITION_IDS: CompositionId[] = FAMILIES.flatMap((family) =>
  ASPECT_IDS.map((aspect) => compositionId({family, aspect})),
);
