import type {VideoSpec} from '../../types';

export const pythonFundamentals: VideoSpec = {
  channel: 'tech',
  slug: 'python-fundamentals',
  title: 'Python Fundamentals: From Variables to Functions',
  template: 'tech-youtube-deep-dive',
  summary:
    'A five-minute visual introduction to Python execution, data types, collections, control flow, functions, imports, exceptions, and one complete program.',
  fps: 30,
  deliveries: ['youtube-long', 'instagram-reel'],
  audience: {level: 'beginner'},
  captions: true,
  audio: 'audio/tech/python-fundamentals/master.wav',
  captionTimings: 'audio/tech/python-fundamentals/words.json',
  editorial: {
    language: 'en',
    objective:
      'Help beginners trace how Python executes a file and combine values, collections, control flow, functions, imports, and exception handling in a small working program.',
    sources: [
      {
        title: 'Python Language Reference — Execution model',
        url: 'https://docs.python.org/3/reference/executionmodel.html',
      },
      {
        title: 'Python Standard Library — dis: Disassembler for Python bytecode',
        url: 'https://docs.python.org/3/library/dis.html',
      },
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
    ],
  },
  scenes: [
    {
      id: 'hook',
      type: 'title',
      durationInFrames: 90,
      kicker: 'Python to AI Engineer',
      title: 'Python Fundamentals',
      subtitle: 'How readable code becomes a working program.',
      narration: 'Python turns readable ideas into running programs.',
    },
    {
      id: 'roadmap',
      type: 'steps',
      durationInFrames: 450,
      chapterTitle: 'The five-minute roadmap',
      kicker: 'What you will learn',
      items: [
        {
          label: 'Execute',
          detail: 'source → code object → runtime',
          accent: 'info',
        },
        {
          label: 'Represent',
          detail: 'names, types, and collections',
          accent: 'primary',
        },
        {
          label: 'Control',
          detail: 'branches, loops, and functions',
          accent: 'attention',
        },
        {
          label: 'Compose',
          detail: 'imports, exceptions, and a program',
          accent: 'success',
        },
      ],
      narration:
        'In five minutes, you will see how Python executes a file, how names connect to typed objects, how collections organize data, and how control flow, functions, imports, and exceptions combine into one small working program.',
    },
    {
      id: 'execution',
      type: 'architecture',
      durationInFrames: 900,
      chapterTitle: 'How Python executes code',
      kicker: '1 · Execution model',
      title: 'From source to effects',
      nodes: [
        {
          id: 'source',
          label: 'Source',
          sub: 'program.py',
          col: 0,
          row: 0,
          accent: 'info',
        },
        {
          id: 'parse',
          label: 'Parse + Compile',
          sub: 'validate structure',
          col: 1,
          row: 0,
          accent: 'primary',
        },
        {
          id: 'code',
          label: 'Code Object',
          sub: 'CPython bytecode',
          col: 0,
          row: 1,
          accent: 'attention',
        },
        {
          id: 'runtime',
          label: 'Interpreter',
          sub: 'execute in frames',
          col: 1,
          row: 1,
          accent: 'success',
        },
      ],
      edges: [
        {from: 'source', to: 'parse', label: 'read'},
        {from: 'parse', to: 'code', label: 'compile'},
        {from: 'code', to: 'runtime', label: 'evaluate'},
      ],
      reveal: [['source'], ['parse'], ['code'], ['runtime']],
      trace: {
        path: ['source', 'parse', 'code', 'runtime'],
        label: 'valid source becomes executable behavior',
      },
      narration:
        'When you run a Python file, Python first reads and parses the source. Invalid grammar stops with a Syntax Error before execution begins. A Python implementation compiles valid code into a code object. In C Python, that object contains bytecode instructions, and the interpreter evaluates them inside execution frames. Statements bind names, call functions, and create effects such as printed output. Bytecode is an implementation detail, so keep the portable model: parse valid source, create executable instructions, then execute them.',
    },
    {
      id: 'variables-types',
      type: 'flow',
      durationInFrames: 900,
      chapterTitle: 'Variables and data types',
      kicker: '2 · Names and objects',
      title: 'Assignment binds a name',
      steps: [
        {
          label: 'Create value',
          detail: '3 is an int object',
          accent: 'info',
        },
        {
          label: 'Bind name',
          detail: 'count refers to 3',
          accent: 'primary',
        },
        {
          label: 'Use object',
          detail: 'type controls operations',
          accent: 'attention',
        },
        {
          label: 'Rebind or mutate',
          detail: 'two different changes',
          accent: 'success',
        },
      ],
      narration:
        'A variable is a name bound to an object. The object carries its type; the name does not. Writing count equals three binds count to an integer object. Reassigning count changes the binding, not the old integer. Integers, floats, booleans, strings, and none are common values. Lists and dictionaries are mutable, so their contents can change in place. Assignment does not automatically copy an object, which is why two names can observe the same mutable list.',
    },
    {
      id: 'collections',
      type: 'compare',
      durationInFrames: 900,
      chapterTitle: 'Lists, tuples, sets, and dictionaries',
      kicker: '3 · Organize data',
      title: 'Sequence, uniqueness, or lookup?',
      left: {
        heading: 'Ordered sequences',
        points: [
          'list → ordered and mutable',
          'tuple → ordered and structurally immutable',
          'both support iteration',
          'both support numeric indexing',
        ],
        accent: 'info',
      },
      right: {
        heading: 'Uniqueness and lookup',
        points: [
          'set → unique elements',
          'set → fast membership model',
          'dict → unique keys mapped to values',
          'dict → preserves insertion order',
        ],
        accent: 'success',
      },
      narration:
        'Choose a collection by its job. A list keeps an ordered, mutable sequence and supports indexing. A tuple is ordered, but its structure cannot be reassigned after creation, so it suits fixed records. A set stores unique elements and works well for membership checks or removing duplicates; do not depend on display order. A dictionary maps unique keys to values and preserves insertion order. Use lists for sequences, tuples for fixed groupings, sets for uniqueness, and dictionaries for labeled lookup.',
    },
    {
      id: 'control-flow',
      type: 'code',
      durationInFrames: 900,
      chapterTitle: 'If statements and loops',
      kicker: '4 · Choose and repeat',
      title: 'Filter passing scores',
      lang: 'python',
      filename: 'control_flow.py',
      lines: [
        'scores = [72, 91, 64]',
        '',
        'for score in scores:',
        '    if score >= 70:',
        '        print(score, "pass")',
      ],
      focus: [
        {lines: [3], note: 'for binds score to each item in order'},
        {lines: [4], note: 'if selects which loop iterations continue'},
        {lines: [5], note: 'only matching values reach this statement'},
      ],
      narration:
        'Control flow decides which statements run and how often. An if chain evaluates conditions from top to bottom and enters the first matching branch. A for loop asks an iterable for each item and runs its indented body once per item. Here, score receives each number. Only values at least seventy reach print, producing seventy-two and ninety-one. Indentation defines Python’s blocks; it is not decoration. Use while when repetition depends on a condition rather than a known collection.',
    },
    {
      id: 'functions',
      type: 'code',
      durationInFrames: 900,
      chapterTitle: 'Functions, parameters, and return values',
      kicker: '5 · Package behavior',
      title: 'Compute once, reuse anywhere',
      lang: 'python',
      filename: 'functions.py',
      lines: [
        'def average(values):',
        '    total = sum(values)',
        '    return total / len(values)',
        '',
        'result = average([8, 10, 12])',
        'print(result)',
      ],
      focus: [
        {lines: [1], note: 'def binds the function name'},
        {lines: [2, 3], note: 'parameters become local names during the call'},
        {lines: [5, 6], note: 'return supplies 10.0 back to the caller'},
      ],
      narration:
        'Def creates a function object; its body runs only when called. During the call, arguments bind to parameters in a new local execution frame. Here, values receives the list. Sum produces a total, len counts items, and return sends the average back to the caller. Return differs from print: return provides a value that other code can reuse, while print only writes text. Functions package behavior behind a name, reduce repetition, and make logic easier to test and combine.',
    },
    {
      id: 'modules-imports',
      type: 'architecture',
      durationInFrames: 900,
      chapterTitle: 'Modules and imports',
      kicker: '6 · Reuse across files',
      title: 'Import through a namespace',
      nodes: [
        {
          id: 'app',
          label: 'app.py',
          sub: 'your module',
          col: 0,
          row: 0,
          accent: 'info',
        },
        {
          id: 'importer',
          label: 'Import System',
          sub: 'find + initialize',
          col: 1,
          row: 0,
          accent: 'primary',
        },
        {
          id: 'statistics',
          label: 'statistics',
          sub: 'standard library module',
          col: 0,
          row: 1,
          accent: 'attention',
        },
        {
          id: 'mean',
          label: 'mean()',
          sub: 'bound imported name',
          col: 1,
          row: 1,
          accent: 'success',
        },
      ],
      edges: [
        {from: 'app', to: 'importer', label: 'import'},
        {from: 'importer', to: 'statistics', label: 'load'},
        {from: 'statistics', to: 'mean', label: 'select'},
        {from: 'mean', to: 'app', label: 'bind', dashed: true},
      ],
      reveal: [['app'], ['importer'], ['statistics'], ['mean']],
      trace: {
        path: ['app', 'importer', 'statistics', 'mean', 'app'],
        label: 'from statistics import mean',
      },
      narration:
        'A module is usually a Python file with its own global namespace. Import asks the system to find and initialize that module, then binds a name in the importing file. From statistics import mean binds only the selected name. Code initializes the first time its module loads in that interpreter process, then is reused from the module cache. Prefer explicit imports so readers see where behavior comes from. Packages organize related modules into directories, giving larger applications clear boundaries.',
    },
    {
      id: 'exceptions',
      type: 'compare',
      durationInFrames: 900,
      chapterTitle: 'Errors and exception handling',
      kicker: '7 · Handle expected failure',
      title: 'Before execution versus during execution',
      left: {
        heading: 'Syntax error',
        points: [
          'parser cannot build valid code',
          'execution does not begin',
          'fix the program structure',
        ],
        accent: 'attention',
      },
      right: {
        heading: 'Exception',
        points: [
          'valid code fails while running',
          'try marks the risky operation',
          'except handles a specific type',
        ],
        accent: 'success',
      },
      narration:
        'Python has two failure moments. A syntax error means parsing could not produce valid code, so execution never starts. An exception happens while valid code runs: converting hello to an integer raises Value Error. A try block marks the operation that may fail. An except clause handles a specific type and lets execution continue. Catch narrowly; catching everything can hide mistakes. Use finally for cleanup that must happen whether the operation succeeds or fails, such as closing a file.',
    },
    {
      id: 'complete-program',
      type: 'code',
      durationInFrames: 900,
      chapterTitle: 'A complete Python program',
      kicker: '8 · Put it together',
      title: 'Build a student report',
      lang: 'python',
      filename: 'student_report.py',
      lines: [
        'from statistics import mean',
        'def summarize(raw):',
        '    scores = list(map(int, raw))',
        '    avg = mean(scores)',
        '    status = "pass"',
        '    if avg < 70:',
        '        status = "retry"',
        '    return avg, status',
        'try:',
        '    avg, status = summarize(',
        '        ["82", "74", "91"])',
        '    print(f"Average: {avg:.1f}")',
        '    print(f"Status: {status}")',
        'except ValueError:',
        '    print("Use numeric scores")',
      ],
      focus: [
        {lines: [1, 2]},
        {lines: [3, 4, 5, 6, 7, 8]},
        {lines: [9, 10, 11, 14, 15]},
      ],
      narration:
        'Now combine the fundamentals. The program imports mean from the standard library. Summarize receives text scores, converts each value to an integer, calculates the average, chooses a status, and returns both results. The caller prints labeled output. Try and except handle invalid numeric input without hiding unrelated bugs. Notice the layers: a list holds data, a function owns the transformation, control flow chooses the status, an import supplies reusable behavior, and an exception defines the expected failure path.',
    },
    {
      id: 'run-program',
      type: 'terminal',
      durationInFrames: 720,
      chapterTitle: 'Run and verify the program',
      title: 'Execution makes the model concrete',
      host: 'python-fundamentals',
      entries: [
        {
          cmd: 'python3 student_report.py',
          out: ['Average: 82.3', 'Status: pass'],
          accent: 'success',
        },
        {
          cmd: 'python3 -m py_compile student_report.py',
          out: ['(no output means compilation succeeded)'],
          accent: 'info',
        },
      ],
      narration:
        'Run the file and Python executes the module from top to bottom. The function definition binds summarize, then the try block calls it. The score strings become integers, mean returns eighty-two point three, and both results return to the caller. Print produces the terminal output. Py compile then confirms that the file parses and compiles; no output means no syntax error was found.',
    },
    {
      id: 'final-check',
      type: 'steps',
      durationInFrames: 360,
      chapterTitle: 'Final knowledge check',
      kicker: 'Before moving on',
      items: [
        {
          label: 'Trace execution',
          detail: 'source → code object → effects',
          accent: 'info',
        },
        {
          label: 'Choose data',
          detail: 'type and collection match the job',
          accent: 'primary',
        },
        {
          label: 'Compose behavior',
          detail: 'functions, imports, and exceptions',
          accent: 'success',
        },
      ],
      footnote: 'If you can explain the output, you understand the program.',
      narration:
        'Before moving on, check three things: can you trace execution, choose the correct collection, and explain what each function returns? If yes, you have the foundation needed for larger Python services.',
    },
    {
      id: 'recap',
      type: 'outro',
      durationInFrames: 180,
      recap: [
        'names bind to typed objects',
        'control flow chooses what runs',
        'functions and modules build systems',
      ],
      tagline: 'Build the mental model. Then build the system.',
      cta: 'Next: Python variables and data types.',
      narration:
        'Next, practise each concept, then use these foundations to build your first Fast API service.',
    },
  ],
};
