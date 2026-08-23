import {
  ASPECTS,
  ASPECT_IDS,
  LEGACY_DELIVERY_VARIANTS,
  OUTPUT_VARIANTS,
  variantById,
  type AspectId,
  type OutputVariant,
} from '@video-kit/core/output';
import {DELIVERIES} from '@video-kit/core/publishing';

export {ASPECTS, ASPECT_IDS, OUTPUT_VARIANTS};
export type {AspectId, OutputVariant};

/**
 * The picker options, derived rather than typed out.
 *
 * These lists used to be literals in App.tsx — a fifth and sixth copy of tables
 * that already existed in the render kit and the CLI. Both had drifted: the
 * delivery list silently omitted carousels, and the aspect buttons omitted 4:5.
 * Deriving them means a new output shows up in the UI with no edit here.
 */
export const DELIVERY_CHOICES = Object.values(DELIVERIES).map((delivery) => ({
  id: delivery.id,
  label: delivery.label,
  platform: delivery.platform,
  /** What this delivery actually produces, for the summary under the checkbox. */
  produces: (LEGACY_DELIVERY_VARIANTS[delivery.id] ?? []).map(variantById),
}));

const RATIOS: Record<AspectId, string> = {
  landscape: '16:9',
  portrait: '9:16',
  square: '1:1',
  carousel: '4:5',
};

export const aspectRatioLabel = (id: AspectId) => RATIOS[id] ?? ASPECTS[id].label;

/**
 * Every variant a project can ask for, grouped by what it produces.
 *
 * Derived from the registry, so a newly registered variant appears in the
 * picker with no edit here. The delivery checkboxes above cover the five
 * platform packages; this is what makes the standalone artifacts — poster,
 * OG card, looping GIF, storyboard sheet — reachable at all, which they were
 * not while `outputs` was missing from the spec contract.
 */
export const VARIANT_GROUPS: {kind: OutputVariant['kind']; label: string; variants: OutputVariant[]}[] =
  (
    [
      ['video', 'Video'],
      ['still', 'Stills'],
      ['still-sequence', 'Slide sets'],
      ['animated-image', 'Animated'],
      ['document', 'Documents'],
    ] as const
  ).map(([kind, label]) => ({
    kind,
    label,
    variants: Object.values(OUTPUT_VARIANTS).filter((variant) => variant.kind === kind),
  }))
    .filter((group) => group.variants.length > 0);

/**
 * What a project produces when it has chosen nothing explicitly. Mirrors
 * `variantsFor`, which falls back to the deliveries — an empty selection means
 * "the defaults", never "produce nothing".
 */
export const defaultVariantsFor = (deliveries: string[]) =>
  [
    ...new Set(
      deliveries.flatMap(
        (id) => LEGACY_DELIVERY_VARIANTS[id as keyof typeof LEGACY_DELIVERY_VARIANTS] ?? [],
      ),
    ),
  ].map(variantById);

/** Human summary of what a set of deliveries will produce. */
export const describeOutputs = (deliveries: string[]) => {
  const variants = defaultVariantsFor(deliveries);
  const counts = new Map<string, number>();
  for (const variant of variants) {
    counts.set(variant.kind, (counts.get(variant.kind) ?? 0) + 1);
  }
  return [...counts].map(([kind, count]) => `${count} ${kind}`).join(', ');
};
