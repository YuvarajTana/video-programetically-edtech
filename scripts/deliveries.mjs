export const DELIVERIES = {
  'youtube-long': {
    id: 'youtube-long',
    label: 'YouTube 16:9',
    platform: 'youtube',
    renderProfile: 'landscape',
  },
  'youtube-short': {
    id: 'youtube-short',
    label: 'YouTube Short 9:16',
    platform: 'youtube',
    renderProfile: 'portrait',
  },
  'instagram-reel': {
    id: 'instagram-reel',
    label: 'Instagram Reel 9:16',
    platform: 'instagram',
    renderProfile: 'portrait',
  },
  'instagram-feed': {
    id: 'instagram-feed',
    label: 'Instagram Feed 1:1',
    platform: 'instagram',
    renderProfile: 'square',
  },
  'instagram-carousel': {
    id: 'instagram-carousel',
    label: 'Instagram Carousel 4:5',
    platform: 'instagram',
    renderProfile: 'carousel',
    stills: true,
  },
};

/** Render profiles that only ever ship as still sequences, never as video. */
export const STILL_PROFILES = new Set(
  Object.values(DELIVERIES)
    .filter((delivery) => delivery.stills)
    .map((delivery) => delivery.renderProfile),
);

export const refOf = (spec) => `${spec.channel}/${spec.slug}`;

export const deliveriesFor = (spec, channel) =>
  spec.deliveries ?? channel.defaultDeliveries;

export const preferredRenderProfile = (spec, channel) => {
  const profiles = deliveriesFor(spec, channel).map(
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

export const videoComposition = (composition) => {
  const parts = composition.id.split('--');
  return parts.length === 3 && parts[2] !== 'cover';
};

export const coverComposition = (composition) => {
  const parts = composition.id.split('--');
  return parts.length === 4 && parts[3] === 'cover';
};
