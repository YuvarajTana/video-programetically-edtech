import type {VideoSpec} from '../../types';

export const selectionSort: VideoSpec = {
  channel: 'tech',
  slug: 'selection-sort',
  title: 'Selection Sort, visually',
  template: 'algorithm-visualized',
  summary: 'Find the smallest, swap it to the front, repeat — and why that costs O(n²).',
  deliveries: ['youtube-long', 'instagram-reel'],
  audience: {level: 'beginner'},
  editorial: {
    language: 'en',
    objective: 'Show how selection sort moves the minimum value into place.',
    sources: [{title: 'Selection sort algorithm and comparison complexity'}],
  },
  scenes: [
    {
      type: 'title',
      durationInFrames: 90,
      kicker: 'Algorithms, visually',
      title: 'Selection Sort',
      subtitle: 'The simplest sort you will ever write. Also one of the slowest.',
      narration: 'Selection sort: simple to understand, slow to run.',
    },
    {
      type: 'steps',
      durationInFrames: 120,
      kicker: 'The whole idea',
      items: [
        {label: 'Find the smallest', detail: 'Scan everything that is left', accent: 'attention'},
        {label: 'Swap it to the front', detail: 'One swap per pass, no more', accent: 'primary'},
        {label: 'Repeat with the rest', detail: 'The sorted part grows from the left', accent: 'success'},
      ],
      footnote: 'That is the entire algorithm.',
      narration: 'Find the smallest, swap it to the front, repeat with what is left.',
    },
    {
      type: 'arrayViz',
      durationInFrames: 450,
      algorithm: 'selection',
      values: [8, 5, 2, 6, 1, 4],
      narration: 'Watch it run. Coral is what it is checking, amber is the smallest so far, teal is settled.',
    },
    {
      type: 'bigStat',
      durationInFrames: 150,
      kicker: 'The cost',
      value: 'O(n²)',
      label: 'n(n-1)/2 comparisons — always',
      note: 'Hand it a sorted list and it still makes every single comparison.',
      narration: 'Every pass scans everything left, so the comparison count never drops.',
    },
    {
      type: 'outro',
      durationInFrames: 90,
      recap: ['for each slot:', '  find the smallest of what is left', '  swap it in'],
      tagline: 'One algorithm at a time.',
      narration: 'Selection sort in three lines.',
    },
  ],
};
