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
      type: 'quiz',
      durationInFrames: 150,
      question: 'Which color scatters most?',
      options: [
        {label: 'Red', emoji: '🔴'},
        {label: 'Blue', emoji: '🔵'},
        {label: 'Green', emoji: '🟢'},
      ],
      answerIndex: 1,
      explanation: 'Blue waves are short, so air bounces them everywhere.',
      accent: 'info',
    },
    {
      type: 'colors',
      durationInFrames: 100,
      kicker: 'colors',
      title: 'Red and Blue',
      items: [
        {name: 'Red', hex: '#EF3340', example: 'an apple', emoji: '🍎'},
        {name: 'Blue', hex: '#2F80ED', example: 'a butterfly', emoji: '🦋'},
      ],
      prompt: 'Say both colors!',
    },
    {
      type: 'flashcards',
      durationInFrames: 100,
      kicker: 'flashcards',
      title: 'Lion and Elephant',
      items: [
        {label: 'Lion', emoji: '🦁', clue: 'has a big mane', color: '#F5A524'},
        {label: 'Elephant', emoji: '🐘', clue: 'has a long trunk', color: '#7D91AA'},
      ],
      prompt: 'Say both animals!',
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
