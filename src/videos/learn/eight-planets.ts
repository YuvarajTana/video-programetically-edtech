import type {FlashcardItem, VideoSpec} from '../../types';

const planets: Record<string, FlashcardItem> = {
  mercury: {
    label: 'Mercury',
    emoji: '☿',
    clue: 'smallest and closest to the Sun',
    color: '#A89F91',
    rank: 1,
  },
  venus: {
    label: 'Venus',
    emoji: '🟡',
    clue: 'hottest planet',
    color: '#E9A84A',
    rank: 2,
  },
  earth: {
    label: 'Earth',
    emoji: '🌍',
    clue: 'our home planet',
    color: '#2F80ED',
    rank: 3,
  },
  mars: {
    label: 'Mars',
    emoji: '🔴',
    clue: 'the red planet',
    color: '#E35D45',
    rank: 4,
  },
  jupiter: {
    label: 'Jupiter',
    emoji: '🟠',
    clue: 'the biggest planet',
    color: '#D9915B',
    rank: 5,
  },
  saturn: {
    label: 'Saturn',
    emoji: '🪐',
    clue: 'famous for its rings',
    color: '#E3BE70',
    rank: 6,
  },
  uranus: {
    label: 'Uranus',
    emoji: '🔵',
    clue: 'spins on its side',
    color: '#63C7D4',
    rank: 7,
  },
  neptune: {
    label: 'Neptune',
    emoji: '🔷',
    clue: 'farthest from the Sun',
    color: '#4169E1',
    rank: 8,
  },
};

const planetOrder = [
  planets.mercury,
  planets.venus,
  planets.earth,
  planets.mars,
  planets.jupiter,
  planets.saturn,
  planets.uranus,
  planets.neptune,
];

export const eightPlanets: VideoSpec = {
  channel: 'learn',
  slug: 'eight-planets',
  title: 'Meet the 8 Planets',
  template: 'early-learning-vocabulary',
  summary:
    'Meet the eight planets in order from the Sun, with colorful symbols, simple facts, and a quick space quiz.',
  fps: 30,
  deliveries: ['youtube-short', 'instagram-reel'],
  audience: {ageBand: '5–9', level: 'beginner'},
  captions: true,
  audio: 'audio/learn/eight-planets/master.wav',
  captionTimings: 'audio/learn/eight-planets/words.json',
  editorial: {
    language: 'en',
    objective:
      'Help children name the eight planets in order from the Sun and remember one simple fact about each.',
    safetyStatus: 'approved',
    sources: [
      {
        title: 'About the Planets — NASA Science',
        url: 'https://science.nasa.gov/solar-system/planets/',
      },
      {
        title: 'Solar System Facts — NASA Science',
        url: 'https://science.nasa.gov/solar-system/solar-system-facts/',
      },
    ],
  },
  scenes: [
    {
      id: 'planet-launch',
      type: 'title',
      durationInFrames: 90,
      kicker: 'Space adventure',
      title: 'Meet the 8 Planets!',
      subtitle: 'Fly from the Sun to the edge of our solar system.',
      narration: 'Ready, space explorers? Meet all eight planets!',
    },
    {
      id: 'mercury-and-venus',
      type: 'flashcards',
      durationInFrames: 240,
      kicker: 'Planets 1 and 2',
      title: 'Mercury and Venus',
      items: [planets.mercury, planets.venus],
      prompt: 'Which one is the hottest?',
      narration:
        'Mercury is the smallest planet and closest to the Sun. Venus is covered in clouds and is the hottest planet.',
    },
    {
      id: 'earth-and-mars',
      type: 'flashcards',
      durationInFrames: 240,
      kicker: 'Planets 3 and 4',
      title: 'Earth and Mars',
      items: [planets.earth, planets.mars],
      prompt: 'Wave hello to our home!',
      narration:
        'Earth is our blue home, full of water and life. Mars looks rusty red, so we call it the red planet.',
    },
    {
      id: 'jupiter-and-saturn',
      type: 'flashcards',
      durationInFrames: 240,
      kicker: 'Planets 5 and 6',
      title: 'Jupiter and Saturn',
      items: [planets.jupiter, planets.saturn],
      prompt: 'Can you spot Saturn’s rings?',
      narration:
        'Jupiter is the biggest planet and has a giant storm. Saturn is famous for its beautiful rings.',
    },
    {
      id: 'uranus-and-neptune',
      type: 'flashcards',
      durationInFrames: 240,
      kicker: 'Planets 7 and 8',
      title: 'Uranus and Neptune',
      items: [planets.uranus, planets.neptune],
      prompt: 'These chilly planets are far away!',
      narration:
        'Uranus is an icy planet that spins on its side. Neptune is blue, windy, and farthest from the Sun.',
    },
    {
      id: 'planet-parade',
      type: 'flashcards',
      durationInFrames: 300,
      kicker: 'Planet parade',
      title: 'Say them in order!',
      items: planetOrder,
      prompt: 'Mercury to Neptune—great job!',
      narration:
        'Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. That is every planet in order from the Sun!',
    },
    {
      id: 'space-quiz',
      type: 'steps',
      durationInFrames: 240,
      kicker: 'Quick space quiz',
      items: [
        {
          label: 'Our home?',
          detail: 'Earth',
          accent: 'info',
        },
        {
          label: 'Biggest planet?',
          detail: 'Jupiter',
          accent: 'attention',
        },
        {
          label: 'Planet with rings?',
          detail: 'Saturn',
          accent: 'success',
        },
      ],
      footnote: 'You are a planet expert!',
      narration:
        'Quick quiz! Our home is Earth. The biggest planet is Jupiter. And the planet famous for rings is Saturn.',
    },
    {
      id: 'planet-outro',
      type: 'outro',
      durationInFrames: 180,
      recap: ['4 rocky inner planets', '4 giant outer planets', '8 planets in all'],
      tagline: 'Amazing work, space explorer!',
      cta: 'Watch again and name them faster.',
      narration:
        'Amazing work, space explorer! Watch again and try to name every planet even faster.',
    },
  ],
};
