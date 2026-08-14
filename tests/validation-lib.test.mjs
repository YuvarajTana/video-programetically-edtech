import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateCollection, validateSpec} from '../scripts/validation-lib.mjs';
import {errorsOf, makeChannel, makeSpec, warningsOf} from './helpers.mjs';

test('a well-formed spec produces no issues', () => {
  const issues = validateSpec(makeSpec(), makeChannel());
  assert.deepEqual(issues, []);
});

test('unknown channel is a single hard error', () => {
  const issues = validateSpec(makeSpec({channel: 'nope'}), undefined);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'error');
  assert.equal(issues[0].path, 'channel');
});

test('slug must be lowercase kebab-case', () => {
  for (const slug of ['Bad', 'has spaces', 'trailing-', 'UPPER', '']) {
    const issues = validateSpec(makeSpec({slug}), makeChannel());
    assert.ok(
      errorsOf(issues).some((issue) => issue.path === 'slug'),
      `expected slug error for "${slug}"`,
    );
  }
});

test('fps outside 1-120 or non-integer is rejected', () => {
  for (const fps of [0, -30, 121, 29.97]) {
    const issues = validateSpec(makeSpec({fps}), makeChannel());
    assert.ok(errorsOf(issues).some((issue) => issue.path === 'fps'), `fps ${fps}`);
  }
  const valid = validateSpec(makeSpec({fps: 60}), makeChannel());
  assert.ok(!valid.some((issue) => issue.path === 'fps'));
});

test('duplicate scene ids are rejected', () => {
  const spec = makeSpec();
  spec.scenes = spec.scenes.map((scene) => ({...scene, id: 'same'}));
  const issues = validateSpec(spec, makeChannel());
  assert.ok(errorsOf(issues).some((issue) => issue.message.includes('duplicate scene id')));
});

test('narration speed above the channel limit warns', () => {
  const spec = makeSpec();
  spec.scenes[0].narration = Array(40).fill('word').join(' ');
  spec.scenes[0].durationInFrames = 90; // 40 words in 3s = 800 WPM
  const issues = validateSpec(spec, makeChannel());
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('WPM')));
});

test('architecture edges and traces must reference known nodes', () => {
  const spec = makeSpec();
  spec.scenes.splice(1, 0, {
    type: 'architecture',
    durationInFrames: 120,
    nodes: [{id: 'a', label: 'A', col: 1, row: 1}],
    edges: [{from: 'a', to: 'ghost'}],
    trace: {path: ['a', 'phantom']},
  });
  const issues = validateSpec(spec, makeChannel());
  const messages = errorsOf(issues).map((issue) => issue.message);
  assert.ok(messages.some((message) => message.includes('"ghost"')));
  assert.ok(messages.some((message) => message.includes('"phantom"')));
});

test('learn channel requires age band, objective, and safety review', () => {
  const channel = makeChannel({
    id: 'learn',
    editorial: {
      requiresAgeBand: true,
      requiresLearningObjective: true,
      requiresSafetyReview: true,
      maxSeconds: 90,
    },
  });
  const issues = validateSpec(makeSpec({channel: 'learn'}), channel);
  const paths = errorsOf(issues).map((issue) => issue.path);
  assert.ok(paths.includes('audience.ageBand'));
  assert.ok(paths.includes('editorial.objective'));
  assert.ok(paths.includes('editorial.safetyStatus'));
});

test('audio and caption timing paths may not escape public/', () => {
  const issues = validateSpec(
    makeSpec({audio: '../secrets.wav', captionTimings: '../../etc/timings.json'}),
    makeChannel(),
  );
  const paths = errorsOf(issues).map((issue) => issue.path);
  assert.ok(paths.includes('audio'));
  assert.ok(paths.includes('captionTimings'));
});

// ------------------------------------------------------------------- quiz

const withQuiz = (quiz) => {
  const spec = makeSpec();
  spec.scenes.splice(1, 0, {
    type: 'quiz',
    durationInFrames: 150,
    question: 'Which one?',
    options: [{label: 'A'}, {label: 'B'}],
    answerIndex: 0,
    ...quiz,
  });
  return spec;
};

test('a well-formed quiz passes', () => {
  assert.deepEqual(validateSpec(withQuiz({}), makeChannel()), []);
});

test('quiz needs two to four options', () => {
  for (const options of [[], [{label: 'Only'}], Array(5).fill({label: 'X'})]) {
    const issues = validateSpec(withQuiz({options, answerIndex: 0}), makeChannel());
    assert.ok(
      errorsOf(issues).some((issue) => issue.path.endsWith('options')),
      `expected options error for ${options.length} options`,
    );
  }
});

test('quiz answerIndex must point at an option', () => {
  for (const answerIndex of [-1, 2, 1.5, undefined]) {
    const issues = validateSpec(withQuiz({answerIndex}), makeChannel());
    assert.ok(
      errorsOf(issues).some((issue) => issue.path.endsWith('answerIndex')),
      `expected answerIndex error for ${answerIndex}`,
    );
  }
});

test('quiz warns when the answer reveals without a thinking pause', () => {
  const issues = validateSpec(withQuiz({revealAtFrame: 10}), makeChannel());
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('thinking pause')));
});

test('quiz warns when the reveal leaves no time to show the answer', () => {
  const issues = validateSpec(withQuiz({revealAtFrame: 145}), makeChannel());
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('show the answer')));
});

// ------------------------------------------------------------ soundtrack

test('soundtrack assets require credit and license', () => {
  const spec = makeSpec({
    soundtrack: {
      music: {src: 'audio/tech/context-vs-harness-engineering/master.wav'},
    },
  });
  const issues = validateSpec(spec, makeChannel());
  const paths = errorsOf(issues).map((issue) => issue.path);
  assert.ok(paths.includes('soundtrack.music.credit'));
  assert.ok(paths.includes('soundtrack.music.license'));
});

test('sound effect cues must land inside the timeline', () => {
  const spec = makeSpec({
    soundtrack: {
      effects: [
        {
          src: 'audio/tech/context-vs-harness-engineering/master.wav',
          credit: 'Studio',
          license: 'original',
          startFrame: 10_000,
        },
      ],
    },
  });
  const issues = validateSpec(spec, makeChannel());
  assert.ok(errorsOf(issues).some((issue) => issue.path.endsWith('startFrame')));
});

// ------------------------------------------------------------ collection

test('validateCollection flags duplicate refs', () => {
  const channel = makeChannel();
  const results = validateCollection([
    {spec: makeSpec(), channel},
    {spec: makeSpec(), channel},
  ]);
  assert.equal(results.length, 2);
  assert.ok(
    results[1].issues.some((issue) => issue.message.includes('duplicate video ref')),
  );
});
