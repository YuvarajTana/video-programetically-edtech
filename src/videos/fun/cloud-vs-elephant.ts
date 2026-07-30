import type {VideoSpec} from '../../types';

export const cloudVsElephant: VideoSpec = {
  channel: 'fun',
  slug: 'cloud-vs-elephant',
  title: 'Cloud or elephant: which is heavier?',
  template: 'guess-before-the-reveal',
  summary: 'A fluffy cloud hides a surprisingly heavy answer.',
  deliveries: ['youtube-short', 'instagram-reel'],
  audience: {level: 'beginner'},
  editorial: {
    language: 'en',
    objective: 'Create a surprising, factual weight comparison.',
    sources: [
      {
        title: 'How Much Does a Cloud Weigh? — U.S. Geological Survey',
        url: 'https://www.usgs.gov/water-science-school/science/how-much-does-a-cloud-weigh',
      },
    ],
  },
  scenes: [
    {
      type: 'title',
      durationInFrames: 75,
      kicker: 'Guess before the reveal',
      title: 'Cloud or Elephant?',
      subtitle: 'Which one weighs more?',
      narration: 'Cloud or elephant—which one is heavier?',
    },
    {
      type: 'compare',
      durationInFrames: 210,
      kicker: 'Lock in your answer',
      title: 'Heavy versus fluffy',
      left: {
        heading: 'Elephant',
        points: ['solid', 'massive', 'up to several tons'],
        accent: 'attention',
      },
      right: {
        heading: 'Cumulus cloud',
        points: ['looks weightless', 'made of water droplets', 'spreads across the sky'],
        accent: 'info',
      },
      narration: 'An elephant can weigh several tons. A medium cumulus cloud can hold far more water.',
    },
    {
      type: 'bigStat',
      durationInFrames: 225,
      kicker: 'The cloud wins',
      value: '500,000 kg',
      label: 'of water droplets in a one-cubic-kilometer cloud',
      note: 'That is about 551 tons.',
      accent: 'primary',
      narration: 'A one-cubic-kilometer cumulus cloud contains about five hundred thousand kilograms of water droplets.',
    },
    {
      type: 'steps',
      durationInFrames: 180,
      kicker: 'So why does it float?',
      items: [
        {label: 'Huge volume', detail: 'The water spreads through lots of air', accent: 'info'},
        {label: 'Low density', detail: 'The surrounding dry air is denser', accent: 'success'},
      ],
      narration: 'It floats because that water spreads through an enormous volume, while the surrounding dry air is denser.',
    },
    {
      type: 'callout',
      durationInFrames: 120,
      text: 'The fluffy cloud wins.',
      attribution: 'without falling on your head',
      accent: 'attention',
      narration: 'The fluffy cloud wins without falling on your head.',
    },
    {
      type: 'outro',
      durationInFrames: 90,
      tagline: 'Now watch it loop.',
      narration: 'Cloud or elephant? Now you know.',
    },
  ],
};
