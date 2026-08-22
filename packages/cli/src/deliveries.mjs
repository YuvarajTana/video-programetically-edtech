/**
 * CLI helpers. The delivery and format tables used to be hand-copied here and
 * had already drifted — scripts/formats.mjs was missing the carousel format
 * that this file referenced. Both now come from @video-kit/core, which is the
 * only place they are defined.
 */
export {DELIVERIES, deliveriesFor} from '@video-kit/core/publishing';
export {OUTPUT_VARIANTS, variantsFor} from '@video-kit/core/output';

import {DELIVERIES} from '@video-kit/core/publishing';
import {refOf} from '@video-kit/core/editorial';

export {refOf};

export const preferredRenderProfile = (spec, channel) => {
  const profiles = (spec.deliveries ?? channel.defaultDeliveries).map(
    (deliveryId) => DELIVERIES[deliveryId].renderProfile,
  );
  return profiles.includes('portrait') ? 'portrait' : profiles[0];
};

export const matchesRef = (spec, refs) => {
  if (!refs.length) return true;
  const full = refOf(spec);
  return refs.some((ref) => ref === full || ref === spec.slug);
};

export const positionals = (argv, valueFlags = []) => {
  const flags = new Set(valueFlags);
  const values = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      values.push(arg);
      continue;
    }
    if (flags.has(arg.slice(2))) index++;
  }
  return values;
};
