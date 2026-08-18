const FPS = 30;

const todo = (instruction) => `TODO: ${instruction}`;

const titleScene = (title) => ({
  id: 'hook',
  type: 'title',
  durationInFrames: 90,
  kicker: 'Python to AI Engineer',
  title,
  subtitle: todo('State the surprising question or payoff in one short line.'),
  narration: todo('Write a hook of eight words or fewer.'),
});

const outroScene = (durationInFrames = 240) => ({
  id: 'recap',
  type: 'outro',
  durationInFrames,
  recap: [
    todo('Mental model'),
    todo('Practical rule'),
    todo('Next topic'),
  ],
  tagline: 'Build the mental model. Then build the system.',
  cta: 'Follow the Python to AI Engineer path.',
  narration: todo('Recap the single takeaway and bridge to the next lesson.'),
});

const reelConceptScenes = (title) => [
  titleScene(title),
  {
    id: 'problem',
    type: 'callout',
    durationInFrames: 210,
    text: todo('Name the misconception or practical problem.'),
    attribution: 'Why this matters',
    narration: todo('Explain why the viewer needs this concept.'),
  },
  {
    id: 'mental-model',
    type: 'flow',
    durationInFrames: 270,
    kicker: 'Mental model',
    title: todo('Describe the complete flow in one line.'),
    steps: [
      {label: 'Input', detail: todo('What enters'), accent: 'info'},
      {label: 'Mechanism', detail: todo('What changes'), accent: 'primary'},
      {label: 'Output', detail: todo('What leaves'), accent: 'success'},
    ],
    narration: todo('Explain the concept as a three-step flow.'),
  },
  {
    id: 'how-it-works',
    type: 'steps',
    durationInFrames: 300,
    kicker: 'How it works',
    items: [
      {label: 'Step 1', detail: todo('First operation'), accent: 'info'},
      {label: 'Step 2', detail: todo('Second operation'), accent: 'primary'},
      {label: 'Step 3', detail: todo('Third operation'), accent: 'success'},
    ],
    footnote: todo('Add the rule that prevents a common mistake.'),
    narration: todo('Walk through the mechanism with concrete verbs.'),
  },
  {
    id: 'example',
    type: 'code',
    durationInFrames: 330,
    kicker: 'Concrete example',
    title: todo('Name the smallest useful example.'),
    lang: 'python',
    filename: 'example.py',
    lines: [
      '# TODO: replace with a minimal runnable example',
      'value = "input"',
      'result = transform(value)',
      'print(result)',
    ],
    focus: [{lines: [2, 3], note: todo('Explain the important line.')}],
    narration: todo('Connect each important code line to the mental model.'),
  },
  {
    id: 'decision-rule',
    type: 'compare',
    durationInFrames: 300,
    kicker: 'Decision rule',
    title: todo('State the choice the viewer must make.'),
    left: {
      heading: 'Use it when',
      points: [todo('Good condition one'), todo('Good condition two')],
      accent: 'success',
    },
    right: {
      heading: 'Avoid it when',
      points: [todo('Bad condition one'), todo('Bad condition two')],
      accent: 'attention',
    },
    narration: todo('Give a practical use-it-versus-avoid-it rule.'),
  },
  outroScene(270),
];

const reelCodeScenes = (title) => [
  titleScene(title),
  {
    id: 'without-concept',
    type: 'code',
    durationInFrames: 300,
    kicker: 'Before',
    title: todo('Show the repetitive or incorrect version.'),
    lang: 'python',
    filename: 'before.py',
    lines: [
      '# TODO: code before applying the concept',
      'result = do_work()',
      'print(result)',
    ],
    focus: [{lines: [2], note: todo('Name the problem.')}],
    narration: todo('Describe the pain in the original code.'),
  },
  {
    id: 'mechanics',
    type: 'flow',
    durationInFrames: 270,
    kicker: 'Under the hood',
    title: todo('Name what Python does.'),
    steps: [
      {label: 'Define', detail: todo('Definition step'), accent: 'info'},
      {label: 'Apply', detail: todo('Application step'), accent: 'primary'},
      {label: 'Run', detail: todo('Runtime result'), accent: 'success'},
    ],
    narration: todo('Explain the runtime sequence, not just the syntax.'),
  },
  {
    id: 'with-concept',
    type: 'code',
    durationInFrames: 330,
    kicker: 'After',
    title: todo('Show the improved version.'),
    lang: 'python',
    filename: 'after.py',
    lines: [
      '# TODO: minimal runnable code using the concept',
      'result = do_work()',
      'print(result)',
    ],
    focus: [{lines: [1, 2], note: todo('Connect syntax to behavior.')}],
    narration: todo('Trace the improved example line by line.'),
  },
  {
    id: 'pitfalls',
    type: 'compare',
    durationInFrames: 300,
    kicker: 'Common mistake',
    title: 'Looks right versus works right',
    left: {
      heading: 'Mistake',
      points: [todo('Incorrect assumption'), todo('Failure symptom')],
      accent: 'attention',
    },
    right: {
      heading: 'Correct model',
      points: [todo('Correct behavior'), todo('How to verify it')],
      accent: 'success',
    },
    narration: todo('Correct the most common misconception.'),
  },
  {
    id: 'practice',
    type: 'steps',
    durationInFrames: 240,
    kicker: 'Try it',
    items: [
      {label: 'Predict', detail: todo('Ask what runs first'), accent: 'info'},
      {label: 'Run', detail: todo('Give a tiny experiment'), accent: 'primary'},
      {label: 'Explain', detail: todo('State the output in words'), accent: 'success'},
    ],
    narration: todo('Give the viewer one small practice challenge.'),
  },
  outroScene(240),
];

const reelCompareScenes = (title) => [
  titleScene(title),
  {
    id: 'core-difference',
    type: 'compare',
    durationInFrames: 330,
    kicker: 'The core difference',
    title: todo('Contrast the two ideas in one sentence.'),
    left: {
      heading: 'Option A',
      points: [todo('Responsibility'), todo('Strength'), todo('Cost')],
      accent: 'info',
    },
    right: {
      heading: 'Option B',
      points: [todo('Responsibility'), todo('Strength'), todo('Cost')],
      accent: 'success',
    },
    narration: todo('Define both options without declaring a winner.'),
  },
  {
    id: 'decision-flow',
    type: 'flow',
    durationInFrames: 300,
    kicker: 'Choose by constraint',
    title: todo('Name the deciding constraint.'),
    steps: [
      {label: 'Workload', detail: todo('What kind of work'), accent: 'info'},
      {label: 'Constraint', detail: todo('What limits the choice'), accent: 'attention'},
      {label: 'Choice', detail: todo('Which option fits'), accent: 'success'},
    ],
    narration: todo('Turn the comparison into a decision process.'),
  },
  {
    id: 'example-a',
    type: 'code',
    durationInFrames: 300,
    kicker: 'Option A',
    title: todo('A minimal example of option A.'),
    lang: 'python',
    filename: 'option_a.py',
    lines: ['# TODO: minimal example for option A', 'result = option_a()'],
    narration: todo('Explain why this example fits option A.'),
  },
  {
    id: 'example-b',
    type: 'code',
    durationInFrames: 300,
    kicker: 'Option B',
    title: todo('A minimal example of option B.'),
    lang: 'python',
    filename: 'option_b.py',
    lines: ['# TODO: minimal example for option B', 'result = option_b()'],
    narration: todo('Explain why this example fits option B.'),
  },
  {
    id: 'rule-of-thumb',
    type: 'callout',
    durationInFrames: 240,
    text: todo('Write the memorable decision rule.'),
    attribution: 'Rule of thumb',
    narration: todo('State the decision rule and one exception.'),
  },
  outroScene(210),
];

const deepDiveChapter = (index, scene) => ({
  id: `chapter-${index + 1}`,
  durationInFrames: 900,
  chapterTitle: `Chapter ${index + 1}`,
  narration: todo(`Write about 85–100 words for chapter ${index + 1}.`),
  ...scene,
});

const youtubeDeepDiveScenes = (title) => [
  titleScene(title),
  {
    id: 'roadmap',
    type: 'steps',
    durationInFrames: 450,
    chapterTitle: 'Roadmap',
    kicker: 'What you will learn',
    items: [
      {label: 'Mental model', detail: todo('Core idea'), accent: 'info'},
      {label: 'Mechanics', detail: todo('How it runs'), accent: 'primary'},
      {label: 'Production', detail: todo('How to use it safely'), accent: 'success'},
    ],
    narration: todo('Preview the lesson and define the outcome in about 40 words.'),
  },
  deepDiveChapter(0, {
    type: 'callout',
    text: todo('Define the concept precisely.'),
    attribution: 'Foundation',
  }),
  deepDiveChapter(1, {
    type: 'flow',
    kicker: 'Mechanics',
    title: todo('Show the end-to-end flow.'),
    steps: [
      {label: 'Input', detail: todo('Input'), accent: 'info'},
      {label: 'Process', detail: todo('Process'), accent: 'primary'},
      {label: 'Output', detail: todo('Output'), accent: 'success'},
    ],
  }),
  deepDiveChapter(2, {
    type: 'architecture',
    kicker: 'Architecture',
    title: todo('Map the major components.'),
    nodes: [
      {id: 'input', label: 'Input', col: 0, row: 0, accent: 'info'},
      {id: 'core', label: 'Core', col: 1, row: 0, accent: 'primary'},
      {id: 'output', label: 'Output', col: 2, row: 0, accent: 'success'},
    ],
    edges: [
      {from: 'input', to: 'core'},
      {from: 'core', to: 'output'},
    ],
    reveal: [['input'], ['core'], ['output']],
    trace: {path: ['input', 'core', 'output'], label: todo('Trace one request.')},
  }),
  deepDiveChapter(3, {
    type: 'code',
    kicker: 'Implementation',
    title: todo('Build the smallest working example.'),
    lang: 'python',
    filename: 'example.py',
    lines: [
      '# TODO: replace with a complete runnable example',
      'def main():',
      '    result = build()',
      '    return result',
    ],
    focus: [{lines: [2, 3], note: todo('Explain the critical line.')}],
  }),
  deepDiveChapter(4, {
    type: 'terminal',
    title: todo('Run and inspect the example.'),
    host: 'local',
    entries: [
      {cmd: 'python example.py', out: [todo('Expected output')]},
      {cmd: 'pytest -q', out: ['1 passed']},
    ],
  }),
  deepDiveChapter(5, {
    type: 'compare',
    kicker: 'Tradeoffs',
    title: todo('Compare the important alternatives.'),
    left: {
      heading: 'Approach A',
      points: [todo('Strength'), todo('Tradeoff'), todo('Best fit')],
      accent: 'info',
    },
    right: {
      heading: 'Approach B',
      points: [todo('Strength'), todo('Tradeoff'), todo('Best fit')],
      accent: 'success',
    },
  }),
  deepDiveChapter(6, {
    type: 'steps',
    kicker: 'Production checklist',
    items: [
      {label: 'Correctness', detail: todo('Test'), accent: 'info'},
      {label: 'Reliability', detail: todo('Failure handling'), accent: 'attention'},
      {label: 'Observability', detail: todo('Measure'), accent: 'primary'},
      {label: 'Security', detail: todo('Constrain'), accent: 'success'},
    ],
    footnote: todo('Add the production rule that matters most.'),
  }),
  deepDiveChapter(7, {
    type: 'compare',
    kicker: 'Common failures',
    title: 'Symptom versus root cause',
    left: {
      heading: 'Symptom',
      points: [todo('Failure one'), todo('Failure two'), todo('Failure three')],
      accent: 'attention',
    },
    right: {
      heading: 'Root cause',
      points: [todo('Cause one'), todo('Cause two'), todo('Cause three')],
      accent: 'success',
    },
  }),
  {
    id: 'applied-demo',
    type: 'architecture',
    durationInFrames: 720,
    chapterTitle: 'Applied example',
    kicker: 'Put it together',
    title: todo('Show the production use case.'),
    nodes: [
      {id: 'client', label: 'Client', col: 0, row: 0, accent: 'info'},
      {id: 'service', label: 'Service', col: 1, row: 0, accent: 'primary'},
      {id: 'data', label: 'Data', col: 2, row: 0, accent: 'success'},
      {id: 'checks', label: 'Checks', col: 1, row: 1, accent: 'attention'},
    ],
    edges: [
      {from: 'client', to: 'service'},
      {from: 'service', to: 'data'},
      {from: 'service', to: 'checks'},
    ],
    reveal: [['client'], ['service'], ['data', 'checks']],
    trace: {path: ['client', 'service', 'data'], label: todo('Trace one real request.')},
    narration: todo('Apply the entire concept to one production example in about 70 words.'),
  },
  {
    id: 'final-check',
    type: 'steps',
    durationInFrames: 360,
    chapterTitle: 'Final check',
    kicker: 'Before you ship',
    items: [
      {label: 'Can you explain it?', detail: todo('Mental model check'), accent: 'info'},
      {label: 'Can you test it?', detail: todo('Verification check'), accent: 'primary'},
      {label: 'Can you operate it?', detail: todo('Production check'), accent: 'success'},
    ],
    narration: todo('Summarize the three checks in about 35 words.'),
  },
  outroScene(180),
];

export const VIDEO_PRESETS = {
  'reel-concept': {
    id: 'reel-concept',
    label: '60-second concept explainer',
    description: 'Hook → problem → mental model → mechanics → example → decision rule → recap.',
    durationSeconds: 59,
    deliveries: ['youtube-short', 'instagram-reel'],
    template: 'tech-reel-concept',
    buildScenes: reelConceptScenes,
  },
  'reel-code': {
    id: 'reel-code',
    label: '60-second code concept',
    description: 'Before code → runtime mechanics → after code → pitfall → practice → recap.',
    durationSeconds: 59,
    deliveries: ['youtube-short', 'instagram-reel'],
    template: 'tech-reel-code',
    buildScenes: reelCodeScenes,
  },
  'reel-compare': {
    id: 'reel-compare',
    label: '60-second comparison',
    description: 'Core difference → decision flow → two examples → rule of thumb → recap.',
    durationSeconds: 59,
    deliveries: ['youtube-short', 'instagram-reel'],
    template: 'tech-reel-compare',
    buildScenes: reelCompareScenes,
  },
  'youtube-deep-dive': {
    id: 'youtube-deep-dive',
    label: 'Five-minute YouTube deep dive',
    description: 'Roadmap → eight chapters → applied architecture → final check → recap.',
    durationSeconds: 300,
    deliveries: ['youtube-long', 'instagram-reel'],
    template: 'tech-youtube-deep-dive',
    buildScenes: youtubeDeepDiveScenes,
  },
};

export const presetIds = Object.keys(VIDEO_PRESETS);

export const buildVideoSpec = ({channel, slug, title, objective, level, presetId}) => {
  const preset = VIDEO_PRESETS[presetId];
  if (!preset) throw new Error(`Unknown preset "${presetId}".`);
  const scenes = preset.buildScenes(title);
  const durationInFrames = scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );
  if (durationInFrames !== preset.durationSeconds * FPS) {
    throw new Error(
      `${presetId} is ${durationInFrames} frames; expected ${preset.durationSeconds * FPS}.`,
    );
  }
  return {
    channel,
    slug,
    title,
    template: preset.template,
    summary: todo('Write one accurate sentence for platform descriptions.'),
    fps: FPS,
    deliveries: preset.deliveries,
    audience: {level},
    captions: true,
    audio: `audio/${channel}/${slug}/master.wav`,
    captionTimings: `audio/${channel}/${slug}/words.json`,
    editorial: {
      language: 'en',
      objective,
      sources: [],
    },
    scenes,
  };
};

export const renderVideoSource = ({exportName, spec}) =>
  `import type {VideoSpec} from '../../types';\n\nexport const ${exportName}: VideoSpec = ${JSON.stringify(spec, null, 2)};\n`;

const timestamp = (frames) => {
  const seconds = frames / FPS;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`;
};

export const renderScriptTemplate = ({topicId, presetId, spec}) => {
  let cursor = 0;
  const rows = spec.scenes.map((scene, index) => {
    const start = cursor;
    cursor += scene.durationInFrames;
    return `| ${index + 1} | ${timestamp(start)} | ${timestamp(scene.durationInFrames)} | ${scene.type} | ${scene.narration} |`;
  });
  return [
    `# ${spec.title} — production script`,
    '',
    `- Series: Python to AI Engineer`,
    `- Roadmap topic: ${topicId ?? 'ad-hoc'}`,
    `- Preset: ${presetId}`,
    `- Runtime: ${timestamp(cursor)}`,
    `- Deliveries: ${spec.deliveries.join(', ')}`,
    `- Learning objective: ${spec.editorial.objective}`,
    '',
    '## Timed narration plan',
    '',
    '| # | starts | length | visual | narration task |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Writing rules',
    '',
    '- One idea per scene; narration must match the visible mental model.',
    '- Define technical terms before abbreviating them.',
    '- Use a runnable example for code scenes and verify every output.',
    '- Prefer concrete verbs: receives, validates, waits, retrieves, calls, returns.',
    '- Add primary documentation sources before production.',
    '- Remove every `TODO:` marker before voice generation.',
    '',
    '## Production commands',
    '',
    '```bash',
    `npm run validate -- ${spec.channel}/${spec.slug}`,
    `npm run voice -- ${spec.channel}/${spec.slug}`,
    `npm run render -- ${spec.channel}/${spec.slug}`,
    `npm run package -- ${spec.channel}/${spec.slug}`,
    '```',
    '',
  ].join('\n');
};
