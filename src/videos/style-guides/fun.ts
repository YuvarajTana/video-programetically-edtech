import type {VideoSpec} from '../../types';

export const funStyleGuide: VideoSpec = {
  channel: 'fun',
  slug: 'style-guide',
  title: 'Fun channel reference',
  template: 'style-guide',
  kind: 'style-guide',
  deliveries: ['youtube-short', 'instagram-reel'],
  captions: false,
  scenes: [
    {
      type: 'title',
      durationInFrames: 60,
      kicker: 'Guess before the reveal',
      title: 'Which one wins?',
      subtitle: 'You have three seconds.',
      accent: 'primary',
    },
    {
      type: 'kineticText',
      durationInFrames: 84,
      beats: [
        {text: 'Wait'},
        {text: 'for it', accent: 'attention'},
        {text: 'BOOM', accent: 'primary', holdFrames: 36},
      ],
    },
    {
      type: 'compare',
      durationInFrames: 90,
      kicker: 'Pick a side',
      title: 'Speed vs power',
      left: {
        heading: 'Lightning',
        points: ['instant', 'bright', 'gone fast'],
        accent: 'info',
      },
      right: {
        heading: 'Volcano',
        points: ['massive', 'hot', 'keeps going'],
        accent: 'attention',
      },
    },
    {
      type: 'countdown',
      durationInFrames: 100,
      kicker: 'countdown',
      from: 3,
      reveal: 'Both win',
      revealEmoji: '⚡🌋',
      accent: 'attention',
    },
    {
      type: 'bigStat',
      durationInFrames: 70,
      kicker: 'The reveal',
      value: 'BOTH',
      label: 'They win at different games.',
      accent: 'primary',
    },
    {
      type: 'callout',
      durationInFrames: 60,
      text: 'Wait—did you pick the same one?',
      accent: 'attention',
    },
    {
      type: 'outro',
      durationInFrames: 60,
      tagline: 'And now it loops…',
    },
  ],
};
