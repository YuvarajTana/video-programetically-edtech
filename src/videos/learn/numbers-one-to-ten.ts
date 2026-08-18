import type {FlashcardItem, VideoSpec} from '@video-kit/core/spec';

const numberWords = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
] as const;

const accents = [
  'primary',
  'info',
  'attention',
  'success',
  'secondary',
  'primary',
  'info',
  'attention',
  'success',
  'secondary',
] as const;

const reviewNumbers: FlashcardItem[] = numberWords.map((word, index) => ({
  label: word,
  emoji: String(index + 1),
  color: [
    '#FF7043',
    '#2F80ED',
    '#F5A524',
    '#18A979',
    '#7C5CFC',
    '#FF7043',
    '#2F80ED',
    '#F5A524',
    '#18A979',
    '#7C5CFC',
  ][index],
}));

const countingNarration = [
  'One. One dot. Show me one finger.',
  'Two. Two dots. Count them: one, two.',
  'Three. Three dots. One, two, three.',
  'Four. Four dots. One, two, three, four.',
  'Five. Five dots. Count all five with me.',
  'Six. Six dots. We made it past five!',
  'Seven. Seven dots. Count slowly and point.',
  'Eight. Eight dots. Can you find all eight?',
  'Nine. Nine dots. Just one more until ten.',
  'Ten. Ten dots. One, two, three, four, five, six, seven, eight, nine, ten!',
] as const;

export const numbersOneToTen: VideoSpec = {
  channel: 'learn',
  slug: 'numbers-one-to-ten',
  title: 'Learn Numbers 1 to 10',
  template: 'early-learning-counting',
  summary:
    'Learn the numbers one through ten with large numerals, number words, countable dots, repetition, and a quick review.',
  fps: 30,
  deliveries: ['youtube-short', 'instagram-reel'],
  audience: {ageBand: '3–6', level: 'beginner'},
  captions: true,

  audio: 'audio/learn/numbers-one-to-ten/master.wav',
  captionTimings: 'audio/learn/numbers-one-to-ten/words.json',

  editorial: {
    language: 'en',
    objective:
      'Help young learners recognize numerals one through ten, say their names, and match each numeral to a counted quantity.',
    safetyStatus: 'approved',
  },

  scenes: [
    {
      id: 'hook',
      type: 'title',
      durationInFrames: 90,
      kicker: 'Learn it fast',
      title: 'Count to 10!',
      subtitle: 'Look, count, and say each number.',
      narration: 'Can you count all the way to ten?',
    },

    ...numberWords.map(
      (word, index) =>
        ({
          id: `number-${index + 1}`,
          type: 'counting',
          durationInFrames: 180,
          kicker: `Number ${index + 1}`,
          number: index + 1,
          word,
          prompt:
            index < 5
              ? `Hold up ${index + 1} ${index === 0 ? 'finger' : 'fingers'}!`
              : 'Point to each dot as you count!',
          narration: countingNarration[index],
          accent: accents[index],
        }) as const,
    ),

    {
      id: 'number-parade',
      type: 'flashcards',
      durationInFrames: 300,
      kicker: 'Number parade',
      title: 'Say them all!',
      items: reviewNumbers,
      prompt: 'Now count backward from ten!',
      narration:
        'Let us say them together. One, two, three, four, five, six, seven, eight, nine, ten. Fantastic counting!',
    },

    {
      id: 'outro',
      type: 'outro',
      durationInFrames: 210,
      recap: [
        'see the numeral',
        'say the number word',
        'count the matching dots',
      ],
      tagline: 'Great job, number explorer!',
      cta: 'Watch again and count backward.',
      narration:
        'Great job! You counted from one to ten. Now try counting backward.',
    },
  ],
};
