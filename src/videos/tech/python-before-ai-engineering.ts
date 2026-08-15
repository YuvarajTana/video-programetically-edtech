import type {VideoSpec} from '../../types';

export const pythonBeforeAiEngineering: VideoSpec = {
  channel: 'tech',
  slug: 'python-before-ai-engineering',
  title: 'Python Before AI Engineering: The Must-Know Concepts',
  template: 'tech-reel-concept',
  summary:
    'The practical Python concepts to master before building LLM, RAG, and AI agent applications.',
  fps: 30,
  deliveries: ['youtube-short', 'instagram-reel'],
  audience: {level: 'beginner'},
  captions: true,
  audio: 'audio/tech/python-before-ai-engineering/master.wav',
  captionTimings: 'audio/tech/python-before-ai-engineering/words.json',
  editorial: {
    language: 'en',
    objective:
      'Give aspiring AI engineers an ordered, practical checklist of the Python concepts they should master before studying LLM applications, RAG, and agents.',
    sources: [
      {
        title: 'Python Tutorial — An Informal Introduction to Python',
        url: 'https://docs.python.org/3/tutorial/introduction.html',
      },
      {
        title: 'Python Tutorial — More Control Flow Tools',
        url: 'https://docs.python.org/3/tutorial/controlflow.html',
      },
      {
        title: 'Python Tutorial — Data Structures',
        url: 'https://docs.python.org/3/tutorial/datastructures.html',
      },
      {
        title: 'Python Tutorial — Modules',
        url: 'https://docs.python.org/3/tutorial/modules.html',
      },
      {
        title: 'Python Tutorial — Errors and Exceptions',
        url: 'https://docs.python.org/3/tutorial/errors.html',
      },
      {
        title: 'Python Standard Library — asyncio',
        url: 'https://docs.python.org/3/library/asyncio.html',
      },
    ],
  },
  scenes: [
    {
      id: 'hook',
      type: 'title',
      durationInFrames: 90,
      kicker: 'Python to AI Engineer',
      title: 'Python Before AI',
      subtitle: 'The must-know concepts before LLMs, RAG, and agents.',
      narration: 'Before AI engineering, learn the Python that builds it.',
    },
    {
      id: 'reliable-core',
      type: 'callout',
      durationInFrames: 270,
      text: 'Learn the reliable core — not every Python feature.',
      attribution: 'Your goal is to build data pipelines and services.',
      accent: 'primary',
      narration:
        'You do not need every feature. You need a reliable core that turns data into small, testable programs and services.',
    },
    {
      id: 'values-and-collections',
      type: 'compare',
      durationInFrames: 270,
      kicker: '1 · Represent data',
      title: 'Values first, collections next',
      left: {
        heading: 'Core values',
        points: ['names and assignment', 'strings and numbers', 'booleans and None'],
        accent: 'info',
      },
      right: {
        heading: 'Collections',
        points: ['list and tuple', 'set and dictionary', 'nested records and messages'],
        accent: 'success',
      },
      narration:
        'Start with names, strings, numbers, booleans, and None. Master lists, tuples, sets, and dictionaries for records, chunks, messages, and structured model responses.',
    },
    {
      id: 'transform-data',
      type: 'code',
      durationInFrames: 270,
      kicker: '2 · Transform data',
      title: 'Filter model results',
      lang: 'python',
      filename: 'filter_results.py',
      lines: [
        'results = [',
        '    {"score": 0.92},',
        '    {"score": 0.61},',
        ']',
        '',
        'def passing(rows, limit=.8):',
        '    return [row for row in rows',
        '            if row["score"] >= limit]',
        '',
        'print(passing(results))',
      ],
      focus: [
        {lines: [6], note: 'parameters make the transformation reusable'},
        {lines: [7, 8], note: 'the comprehension filters each dictionary'},
      ],
      narration:
        'Learn conditions, loops, comprehensions, functions, parameters, and return values. They filter results, transform data, and keep each processing step testable.',
    },
    {
      id: 'organize-and-recover',
      type: 'steps',
      durationInFrames: 270,
      kicker: '3 · Organize and recover',
      items: [
        {
          label: 'Structure',
          detail: 'modules, imports, and packages',
          accent: 'info',
        },
        {
          label: 'Isolate',
          detail: 'virtual environments and dependencies',
          accent: 'primary',
        },
        {
          label: 'Exchange',
          detail: 'files, JSON, and environment variables',
          accent: 'attention',
        },
        {
          label: 'Recover',
          detail: 'specific exceptions for expected failures',
          accent: 'success',
        },
      ],
      narration:
        'Organize code with modules, imports, packages, and virtual environments. Read files, JSON, and environment variables. Catch expected failures with specific exceptions.',
    },
    {
      id: 'production-python',
      type: 'steps',
      durationInFrames: 270,
      kicker: '4 · Build production habits',
      items: [
        {label: 'Clarify', detail: 'type hints and dataclasses', accent: 'info'},
        {label: 'Observe', detail: 'logging and tests', accent: 'primary'},
        {label: 'Extend', detail: 'generators and decorators', accent: 'attention'},
        {label: 'Coordinate', detail: 'async and await for I/O', accent: 'success'},
      ],
      footnote: 'Async improves waiting-heavy concurrency; it does not make CPU work free.',
      narration:
        'Then add type hints, dataclasses, logging, tests, generators, decorators, and async await. Async helps while applications wait for APIs, databases, and model calls.',
    },
    {
      id: 'map-to-ai',
      type: 'architecture',
      durationInFrames: 270,
      kicker: 'Python becomes AI engineering',
      title: 'The foundation maps directly',
      nodes: [
        {id: 'data', label: 'Messages', sub: 'dicts + JSON', col: 0, row: 0, accent: 'info'},
        {id: 'tools', label: 'Tools', sub: 'functions', col: 1, row: 0, accent: 'primary'},
        {id: 'requests', label: 'Requests', sub: 'async I/O', col: 0, row: 1, accent: 'attention'},
        {id: 'systems', label: 'AI Systems', sub: 'RAG + agents', col: 1, row: 1, accent: 'success'},
      ],
      edges: [
        {from: 'data', to: 'tools', label: 'transform'},
        {from: 'tools', to: 'systems', label: 'compose'},
        {from: 'requests', to: 'systems', label: 'connect'},
      ],
      reveal: [['data'], ['tools'], ['requests'], ['systems']],
      trace: {
        path: ['data', 'tools', 'systems'],
        label: 'tested Python becomes a reliable AI service',
      },
      narration:
        'This maps directly to AI: dictionaries hold messages, functions become tools, async runs requests, and tested modules become reliable RAG and agent services.',
    },
    {
      id: 'recap',
      type: 'outro',
      durationInFrames: 90,
      recap: [
        'data → collections',
        'behavior → functions and modules',
        'services → tests, exceptions, and async',
      ],
      tagline: 'Build the Python foundation. Then build AI.',
      cta: 'Next: LLM fundamentals.',
      narration: 'Master this path, then start LLM fundamentals.',
    },
  ],
};
