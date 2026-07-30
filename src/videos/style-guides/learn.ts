import type {VideoSpec} from '../../types';

export const learnStyleGuide: VideoSpec = {
  channel: 'learn',
  slug: 'style-guide',
  title: 'Learn channel reference',
  template: 'style-guide',
  kind: 'style-guide',
  deliveries: ['youtube-short', 'instagram-reel'],
  captions: false,
  scenes: [
    {
      type: 'title',
      durationInFrames: 80,
      kicker: 'Learn it fast',
      title: 'Why is the sky blue?',
      subtitle: 'One question. One clear visual answer.',
    },
    {
      type: 'steps',
      durationInFrames: 110,
      kicker: 'Three tiny steps',
      items: [
        {label: 'Sunlight arrives', detail: 'It contains every color', accent: 'attention'},
        {label: 'Air scatters blue', detail: 'Short waves bounce around', accent: 'info'},
        {label: 'We see more blue', detail: 'It reaches us from every direction', accent: 'success'},
      ],
      footnote: 'One idea per scene, with friendly language.',
    },
    {
      type: 'bigStat',
      durationInFrames: 80,
      kicker: 'Quick check',
      value: '3… 2… 1…',
      label: 'Which color scatters most?',
      note: 'Pause before the answer reveal.',
      accent: 'info',
    },
    {
      type: 'callout',
      durationInFrames: 80,
      text: 'Blue light scatters more than red light.',
      attribution: 'The answer to remember',
      accent: 'success',
    },
    {
      type: 'outro',
      durationInFrames: 80,
      recap: ['sunlight → air', 'blue scatters → blue sky'],
      tagline: 'Small lesson. Big idea.',
    },
  ],
};
