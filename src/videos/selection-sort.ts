import type {VideoSpec} from '../types';

export const selectionSort: VideoSpec = {
  slug: 'selection-sort',
  title: 'Selection Sort, visually',
  summary: 'Find the smallest, swap it to the front, repeat — and why that costs O(n²).',
  handle: '@AIDataDynamics',
  formats: ['youtube', 'reel'],
  scenes: [
    {
      type: 'title',
      durationInFrames: 90,
      kicker: 'Algorithms, visually',
      title: 'Selection Sort',
      subtitle: 'The simplest sort you will ever write. Also one of the slowest.',
      narration: 'Selection sort — the simplest sorting algorithm, and one of the slowest.',
    },
    {
      type: 'steps',
      durationInFrames: 120,
      kicker: 'The whole idea',
      items: [
        {label: 'Find the smallest', detail: 'Scan everything that is left', accent: 'coral'},
        {label: 'Swap it to the front', detail: 'One swap per pass, no more', accent: 'amber'},
        {label: 'Repeat with the rest', detail: 'The sorted part grows from the left', accent: 'teal'},
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
      handle: '@AIDataDynamics',
      tagline: 'One algorithm at a time.',
      cta: 'Follow for more',
      narration: 'Selection sort in three lines.',
    },
  ],
};
