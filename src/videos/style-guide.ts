import type {VideoSpec} from '../types';

/**
 * Living style guide: one scene of every type, in order.
 *
 * Render stills from this whenever you touch tokens or a shared component — it
 * is the fastest way to see what a design change did to every scene at once.
 */
export const styleGuide: VideoSpec = {
  slug: 'style-guide',
  title: 'Scene kit reference',
  handle: '@AIDataDynamics',
  formats: ['youtube', 'reel'],
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
        {id: 'a', label: 'Client', sub: 'web', col: 0, row: 0, accent: 'violet'},
        {id: 'b', label: 'API', sub: 'fastapi', col: 1, row: 0, accent: 'teal'},
        {id: 'c', label: 'Worker', sub: 'celery', col: 1, row: 1},
        {id: 'd', label: 'DB', sub: 'postgres', col: 0, row: 1, accent: 'coral'},
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
        {cmd: 'npm run render -- cdn-to-container', out: ['bundling…', 'rendering 900 frames']},
        {cmd: 'ls out/', out: ['cdn-to-container.yt.mp4', 'cdn-to-container.reel.mp4']},
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
    {type: 'callout', durationInFrames: 80, text: 'One sentence worth remembering.', attribution: 'attribution'},
    {type: 'arrayViz', durationInFrames: 200, algorithm: 'bubble', values: [5, 1, 4, 2, 8, 3]},
    {type: 'outro', durationInFrames: 80, recap: ['line one', 'line two'], handle: '@AIDataDynamics', tagline: 'tagline', cta: 'Follow for more'},
  ],
};
