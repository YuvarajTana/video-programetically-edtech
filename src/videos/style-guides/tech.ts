import type {VideoSpec} from '../../types';

/**
 * Living style guide: one scene of every type, in order.
 *
 * Render stills from this whenever you touch tokens or a shared component — it
 * is the fastest way to see what a design change did to every scene at once.
 */
export const styleGuide: VideoSpec = {
  channel: 'tech',
  slug: 'style-guide',
  title: 'Scene kit reference',
  template: 'style-guide',
  kind: 'style-guide',
  deliveries: ['youtube-long', 'instagram-reel'],
  captions: false,
  scenes: [
    {type: 'title', durationInFrames: 70, kicker: 'Reference', title: 'Scene Kit', subtitle: 'Every scene type, in order.'},
    {
      type: 'steps',
      durationInFrames: 80,
      kicker: 'steps',
      items: [
        {label: 'First thing', detail: 'supporting detail'},
        {label: 'Second thing', detail: 'supporting detail'},
        {label: 'Third thing', detail: 'supporting detail'},
      ],
      footnote: 'optional footnote',
    },
    {
      type: 'flow',
      durationInFrames: 80,
      kicker: 'flow',
      title: 'User journey',
      steps: [
        {label: 'Sign up', detail: 'email + otp'},
        {label: 'Verify', detail: 'magic link'},
        {label: 'Onboard', detail: 'first workspace'},
      ],
    },
    {
      type: 'architecture',
      durationInFrames: 110,
      kicker: 'architecture',
      title: 'System diagram',
      nodes: [
        {id: 'a', label: 'Client', sub: 'web', col: 0, row: 0, accent: 'info'},
        {id: 'b', label: 'API', sub: 'fastapi', col: 1, row: 0, accent: 'success'},
        {id: 'c', label: 'Worker', sub: 'celery', col: 1, row: 1},
        {id: 'd', label: 'DB', sub: 'postgres', col: 0, row: 1, accent: 'attention'},
      ],
      edges: [
        {from: 'a', to: 'b'},
        {from: 'b', to: 'c', label: 'enqueue'},
        {from: 'c', to: 'd', dashed: true},
      ],
      reveal: [['a'], ['b'], ['c', 'd']],
      trace: {path: ['a', 'b', 'c'], label: 'job submission'},
    },
    {
      type: 'code',
      durationInFrames: 120,
      kicker: 'code',
      title: 'Annotated snippet',
      lang: 'python',
      filename: 'main.py',
      lines: [
        'async def handler(req: Request) -> Response:',
        '    async with pool.acquire() as conn:',
        '        rows = await conn.fetch(QUERY)',
        '    return JSONResponse(rows)',
      ],
      focus: [{lines: [2], note: 'Pooled connection, released on exit.'}],
    },
    {
      type: 'terminal',
      durationInFrames: 130,
      title: 'Command demo',
      host: 'yuvaraj@m4',
      entries: [
        {cmd: 'npm run render -- tech/cdn-to-container', out: ['bundling…', 'rendering 900 frames']},
        {cmd: 'ls out/tech/cdn-to-container/', out: ['renders/', 'youtube-long/', 'instagram-reel/']},
      ],
    },
    {
      type: 'compare',
      durationInFrames: 100,
      kicker: 'compare',
      title: 'A versus B',
      left: {heading: 'Approach A', points: ['simple to reason about', 'cheap to run', 'hits a ceiling']},
      right: {heading: 'Approach B', points: ['scales past the ceiling', 'more moving parts', 'needs ops']},
    },
    {
      type: 'stats',
      durationInFrames: 90,
      kicker: 'stats',
      title: 'Metric cards',
      cards: [
        {label: 'p50', value: '18 ms'},
        {label: 'p95', value: '120 ms'},
        {label: 'error rate', value: '0.02%'},
      ],
    },
    {type: 'bigStat', durationInFrames: 80, kicker: 'bigStat', value: 'O(n²)', label: 'headline number', note: 'supporting note'},
    {
      type: 'chart',
      durationInFrames: 110,
      kicker: 'chart',
      title: 'Context windows, in thousands of tokens',
      unit: 'k',
      bars: [
        {label: 'GPT-2', value: 1},
        {label: 'GPT-3', value: 2},
        {label: 'GPT-4', value: 128},
        {label: 'Claude 3', value: 200},
      ],
      highlightIndex: 3,
      footnote: 'Bars share one hue; the highlight carries the point.',
    },
    {
      type: 'timeline',
      durationInFrames: 110,
      kicker: 'timeline',
      title: 'How models learned to act',
      events: [
        {time: '2018', label: 'Transformers', detail: 'attention everywhere', accent: 'info'},
        {time: '2020', label: 'Few-shot', detail: 'prompting emerges', accent: 'secondary'},
        {time: '2023', label: 'Tool use', detail: 'models call functions', accent: 'primary'},
        {time: '2025', label: 'Agents', detail: 'long-horizon work', accent: 'success'},
      ],
    },
    {
      type: 'image',
      durationInFrames: 100,
      kicker: 'image',
      title: 'Licensed stills, credited on frame',
      caption: 'Cover fit gets a slow push-in; contain letterboxes.',
      image: {
        src: 'media/samples/dusk-gradient.png',
        credit: 'AI Data Dynamics',
        license: 'original',
      },
    },
    {
      type: 'videoClip',
      durationInFrames: 84,
      kicker: 'videoClip',
      title: 'Licensed footage, muted by default',
      clip: {
        src: 'media/samples/kinetic-sample.mp4',
        credit: 'AI Data Dynamics',
        license: 'original',
      },
    },
    {type: 'callout', durationInFrames: 80, text: 'One sentence worth remembering.', attribution: 'attribution'},
    {type: 'arrayViz', durationInFrames: 200, algorithm: 'bubble', values: [5, 1, 4, 2, 8, 3]},
    {type: 'outro', durationInFrames: 80, recap: ['line one', 'line two'], tagline: 'tagline'},
  ],
};
