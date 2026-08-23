import type {VideoSpec} from '@video-kit/core/spec';

/**
 * A music-led, source-backed data reel about global connectivity and mobile
 * broadband traffic. The timeline is exactly 1,800 frames (60 seconds at
 * 30 fps). Values are rounded for display from the committed ITU dataset.
 */
export const internetDataTrends2015To2025: VideoSpec = {
  channel: 'tech',
  slug: 'internet-data-trends-2015-2025',
  title: 'The Internet Data Boom: 2015-2025',
  template: 'motion-data-story',
  summary:
    'Animated official indicators show how global internet access, mobile-broadband connections, and mobile data traffic changed from 2015 to 2025.',
  fps: 30,
  deliveries: ['youtube-short', 'instagram-reel'],
  audience: {level: 'beginner'},
  captions: false,
  soundtrack: {
    music: {
      src: 'audio/music/momentum-grid.m4a',
      credit: 'Video Kit - Momentum Grid',
      license: 'Original project-generated instrumental',
      volume: 0.34,
      loop: false,
      fadeInFrames: 24,
      fadeOutFrames: 75,
    },
  },
  editorial: {
    language: 'en-US',
    objective:
      'Show how internet access and mobile data use changed over the last decade without conflating people, subscriptions, and traffic.',
    safetyStatus: 'approved',
    sources: [
      {
        title: 'ITU - Global and regional ICT data, 2025',
        url: 'https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx?id=29192',
      },
      {
        title: 'ITU - Key ICT indicator aggregates, November 2025',
        url: 'https://www.itu.int/en/ITU-D/Statistics/Documents/facts/ITU_regional_global_Key_ICT_indicator_aggregates_Nov_2025.xlsx',
      },
      {
        title: 'ITU Facts and Figures 2025 - Internet traffic',
        url: 'https://www.itu.int/itu-d/reports/statistics/2025/10/15/ff25-internet-traffic/',
      },
    ],
  },
  scenes: [
    {
      id: 'hook',
      type: 'title',
      durationInFrames: 90,
      kicker: '2015-2025 · global indicators',
      title: 'The Internet Data Boom',
      subtitle: 'Connectivity grew. Data use grew faster.',
      accent: 'primary',
    },
    {
      id: 'internet-users',
      type: 'chart',
      durationInFrames: 300,
      kicker: 'People online · 2015-2025',
      title: 'Internet users roughly doubled',
      unit: 'B',
      bars: [
        {label: '2015', value: 3},
        {label: '17', value: 3.5},
        {label: '19', value: 4.2},
        {label: '21', value: 5.1},
        {label: '23', value: 5.6},
        {label: '2025', value: 6, accent: 'success'},
      ],
      highlightIndex: 5,
      footnote: 'Selected annual markers · 3.0B -> 6.0B people · values rounded',
      accent: 'info',
    },
    {
      id: 'mobile-subscriptions',
      type: 'chart',
      durationInFrames: 270,
      kicker: 'Active mobile broadband · 2015-2025',
      title: 'Connections expanded even faster',
      unit: 'B',
      bars: [
        {label: '2015', value: 3.3},
        {label: '17', value: 4.7},
        {label: '19', value: 5.8},
        {label: '21', value: 6.4},
        {label: '23', value: 7.5},
        {label: '2025', value: 8.2, accent: 'attention'},
      ],
      highlightIndex: 5,
      footnote: 'Selected annual markers · a subscription is not necessarily a unique person.',
      accent: 'attention',
    },
    {
      id: 'mobile-traffic',
      type: 'chart',
      durationInFrames: 360,
      kicker: 'Mobile broadband traffic · 2019-2025',
      title: 'Annual traffic passed 1.5 zettabytes',
      unit: ' EB',
      bars: [
        {label: '2019', value: 419},
        {label: '2020', value: 562},
        {label: '2021', value: 749},
        {label: '2022', value: 927},
        {label: '2023', value: 1123},
        {label: '2025', value: 1502, accent: 'success'},
      ],
      highlightIndex: 5,
      footnote: 'Selected annual markers · ITU series begins in 2019 · 1,000 EB = 1 ZB',
      accent: 'success',
    },
    {
      id: 'growth-rates',
      type: 'stats',
      durationInFrames: 240,
      kicker: 'Same period · 2019-2025',
      title: 'Traffic intensity pulled away',
      cards: [
        {
          label: 'Internet users',
          value: '+44%',
          note: '4.2B -> 6.0B people',
          accent: 'info',
        },
        {
          label: 'Mobile traffic',
          value: '+259%',
          note: '0.42 -> 1.50 ZB/year',
          accent: 'success',
        },
        {
          label: 'Traffic per subscription',
          value: '+153%',
          note: '6.1 -> 15.3 GB/month',
          accent: 'attention',
        },
      ],
    },
    {
      id: 'drivers',
      type: 'flow',
      durationInFrames: 270,
      kicker: 'What bends the curve upward?',
      title: 'More reach × more intensity',
      steps: [
        {label: 'More people', detail: '4.2B -> 6.0B online', accent: 'info'},
        {label: 'More connections', detail: '5.8B -> 8.2B active subscriptions', accent: 'primary'},
        {label: 'More per connection', detail: '6.1 -> 15.3 GB/month', accent: 'attention'},
        {label: 'More total traffic', detail: '0.42 -> 1.50 ZB/year', accent: 'success'},
      ],
    },
    {
      id: 'result',
      type: 'bigStat',
      durationInFrames: 165,
      kicker: 'The result',
      value: '3.6x',
      label: 'mobile traffic in 2025 versus 2019',
      note: 'Traffic grew much faster than the online population.',
      accent: 'success',
    },
    {
      id: 'close',
      type: 'outro',
      durationInFrames: 105,
      recap: ['MORE PEOPLE', 'MORE CONNECTIONS', 'MORE DATA'],
      tagline: 'ITU Facts and Figures 2025 · values rounded',
      accent: 'info',
    },
  ],
};
