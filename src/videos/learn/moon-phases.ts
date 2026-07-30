import type {VideoSpec} from '../../types';

export const moonPhases: VideoSpec = {
  channel: 'learn',
  slug: 'moon-phases',
  title: 'Why does the Moon change shape?',
  template: 'science-visualized',
  summary: 'The Moon stays round; our view of its sunlit half changes as it orbits Earth.',
  deliveries: ['youtube-short', 'instagram-reel'],
  audience: {ageBand: '9–12', level: 'beginner'},
  editorial: {
    language: 'en',
    objective: 'Explain that Moon phases come from our changing view of its illuminated half.',
    safetyStatus: 'approved',
    sources: [
      {
        title: 'Moon Phases — NASA Science',
        url: 'https://science.nasa.gov/moon/moon-phases/',
      },
    ],
  },
  scenes: [
    {
      type: 'title',
      durationInFrames: 90,
      kicker: 'Space in one minute',
      title: 'Moon Phases',
      subtitle: 'The Moon stays round—so why does its bright part change?',
      narration: 'The Moon stays round; only our view changes.',
    },
    {
      type: 'steps',
      durationInFrames: 300,
      kicker: 'Start with sunlight',
      items: [
        {label: 'The Sun shines', detail: 'It lights half of the Moon', accent: 'attention'},
        {label: 'The Moon orbits', detail: 'It moves around Earth', accent: 'info'},
        {label: 'Our view changes', detail: 'We see different amounts of light', accent: 'success'},
      ],
      footnote: 'The Moon does not make its own light.',
      narration: 'Sunlight always illuminates half of the Moon, even when we cannot see that whole bright half from Earth.',
    },
    {
      type: 'flow',
      durationInFrames: 360,
      kicker: 'One repeating cycle',
      title: 'What we see from Earth',
      steps: [
        {label: 'New Moon', detail: 'bright side faces away', accent: 'secondary'},
        {label: 'Quarter', detail: 'half looks bright', accent: 'info'},
        {label: 'Full Moon', detail: 'bright side faces us', accent: 'primary'},
        {label: 'Back again', detail: 'the lit view shrinks', accent: 'success'},
      ],
      narration: 'As the Moon orbits Earth, our viewing angle changes. We see different amounts of the sunlit half, creating the phases.',
    },
    {
      type: 'bigStat',
      durationInFrames: 240,
      kicker: 'The cycle',
      value: '29.5 days',
      label: 'from one new Moon to the next',
      note: 'That is why the pattern repeats about once a month.',
      accent: 'info',
      narration: 'The complete pattern repeats about every twenty-nine and a half days.',
    },
    {
      type: 'compare',
      durationInFrames: 300,
      kicker: 'Two opposite views',
      title: 'New versus full',
      left: {
        heading: 'New Moon',
        points: ['bright half faces away', 'Moon looks almost invisible', 'near the Sun in our sky'],
        accent: 'secondary',
      },
      right: {
        heading: 'Full Moon',
        points: ['bright half faces us', 'round face looks illuminated', 'opposite the Sun in our sky'],
        accent: 'primary',
      },
      narration: 'At new Moon, the bright side faces away from us. At full Moon, the bright side faces toward us.',
    },
    {
      type: 'steps',
      durationInFrames: 300,
      kicker: 'Quick check',
      items: [
        {label: 'Does the Moon shrink?', detail: 'No—it always stays round', accent: 'attention'},
        {label: 'Does it make light?', detail: 'No—it reflects sunlight', accent: 'info'},
        {label: 'What changes?', detail: 'How much of the bright half we see', accent: 'success'},
      ],
      footnote: 'If you chose “our view,” you got it.',
      narration: 'Quick check: the Moon stays round, reflects sunlight, and only the bright portion visible from Earth changes.',
    },
    {
      type: 'outro',
      durationInFrames: 210,
      recap: ['Sun lights half', 'Moon orbits Earth', 'our view creates phases'],
      tagline: 'Small lesson. Big universe.',
      narration: 'The Moon stays round. Its orbit changes the light we see.',
    },
  ],
};
