import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateSpec} from '../packages/cli/src/validation-lib.mjs';
import {errorsOf, makeChannel, makeSpec, warningsOf} from './helpers.mjs';

const withScene = (scene) => {
  const spec = makeSpec();
  spec.scenes.splice(1, 0, scene);
  return spec;
};

// ------------------------------------------------------------------- chart

const chart = (overrides = {}) => ({
  type: 'chart',
  durationInFrames: 120,
  bars: [
    {label: 'A', value: 10},
    {label: 'B', value: 25},
  ],
  ...overrides,
});

test('a well-formed chart passes', () => {
  assert.deepEqual(validateSpec(withScene(chart()), makeChannel()), []);
});

test('chart needs at least two labeled, non-negative bars', () => {
  const single = validateSpec(
    withScene(chart({bars: [{label: 'A', value: 1}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(single).some((issue) => issue.path.endsWith('bars')));

  const bad = validateSpec(
    withScene(chart({bars: [{label: '', value: 3}, {label: 'B', value: -2}]})),
    makeChannel(),
  );
  const paths = errorsOf(bad).map((issue) => issue.path);
  assert.ok(paths.some((path) => path.endsWith('bars[0].label')));
  assert.ok(paths.some((path) => path.endsWith('bars[1].value')));
});

test('chart warns when crowded and rejects a bad highlightIndex', () => {
  const bars = Array.from({length: 7}, (_, i) => ({label: `B${i}`, value: i + 1}));
  const crowded = validateSpec(withScene(chart({bars})), makeChannel());
  assert.ok(warningsOf(crowded).some((issue) => issue.message.includes('cramped')));

  const bad = validateSpec(withScene(chart({highlightIndex: 5})), makeChannel());
  assert.ok(errorsOf(bad).some((issue) => issue.path.endsWith('highlightIndex')));
});

// ---------------------------------------------------------------- timeline

const timeline = (overrides = {}) => ({
  type: 'timeline',
  durationInFrames: 120,
  events: [
    {time: '2020', label: 'Start'},
    {time: '2024', label: 'Now'},
  ],
  ...overrides,
});

test('a well-formed timeline passes', () => {
  assert.deepEqual(validateSpec(withScene(timeline()), makeChannel()), []);
});

test('timeline requires two events with time and label', () => {
  const single = validateSpec(
    withScene(timeline({events: [{time: '2020', label: 'Only'}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(single).some((issue) => issue.path.endsWith('events')));

  const bad = validateSpec(
    withScene(timeline({events: [{time: '', label: 'X'}, {time: '2024', label: ''}]})),
    makeChannel(),
  );
  const paths = errorsOf(bad).map((issue) => issue.path);
  assert.ok(paths.some((path) => path.endsWith('events[0].time')));
  assert.ok(paths.some((path) => path.endsWith('events[1].label')));
});

// ------------------------------------------------------------- kineticText

const kinetic = (overrides = {}) => ({
  type: 'kineticText',
  durationInFrames: 90,
  beats: [{text: 'Wait'}, {text: 'for it'}, {text: 'BOOM', holdFrames: 30}],
  ...overrides,
});

test('a well-formed kineticText passes', () => {
  assert.deepEqual(validateSpec(withScene(kinetic()), makeChannel()), []);
});

test('kineticText rejects empty beats and oversized holds', () => {
  const empty = validateSpec(withScene(kinetic({beats: []})), makeChannel());
  assert.ok(errorsOf(empty).some((issue) => issue.path.endsWith('beats')));

  const over = validateSpec(
    withScene(kinetic({beats: [{text: 'a', holdFrames: 60}, {text: 'b', holdFrames: 60}]})),
    makeChannel(),
  );
  assert.ok(
    errorsOf(over).some((issue) => issue.message.includes('exceed the scene duration')),
  );

  const bad = validateSpec(
    withScene(kinetic({beats: [{text: 'a', holdFrames: 0}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(bad).some((issue) => issue.path.endsWith('holdFrames')));
});

test('kineticText warns when beats flash by too fast to read', () => {
  const beats = Array.from({length: 12}, (_, i) => ({text: `beat ${i}`}));
  const issues = validateSpec(
    withScene(kinetic({beats, durationInFrames: 60})),
    makeChannel(),
  );
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('readable')));
});

// ------------------------------------------------------------- countdown

const countdown = (overrides = {}) => ({
  type: 'countdown',
  durationInFrames: 100,
  from: 3,
  reveal: 'Both win',
  ...overrides,
});

test('a well-formed countdown passes', () => {
  assert.deepEqual(validateSpec(withScene(countdown()), makeChannel()), []);
});

test('countdown bounds from, reveal, and revealFrames', () => {
  for (const from of [1, 11, 2.5]) {
    const issues = validateSpec(withScene(countdown({from})), makeChannel());
    assert.ok(errorsOf(issues).some((issue) => issue.path.endsWith('from')), `from ${from}`);
  }
  const noReveal = validateSpec(withScene(countdown({reveal: ''})), makeChannel());
  assert.ok(errorsOf(noReveal).some((issue) => issue.path.endsWith('reveal')));

  const badReveal = validateSpec(
    withScene(countdown({revealFrames: 100})),
    makeChannel(),
  );
  assert.ok(errorsOf(badReveal).some((issue) => issue.path.endsWith('revealFrames')));
});

test('countdown warns when numbers flash too fast', () => {
  const issues = validateSpec(
    withScene(countdown({from: 10, durationInFrames: 60})),
    makeChannel(),
  );
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('more time')));
});

// ------------------------------------------------------------ numberLine

const numberLine = (overrides = {}) => ({
  type: 'numberLine',
  durationInFrames: 110,
  min: 0,
  max: 10,
  marks: [{value: 3}, {value: 5}],
  jump: {from: 3, to: 5},
  ...overrides,
});

test('a well-formed numberLine passes', () => {
  assert.deepEqual(validateSpec(withScene(numberLine()), makeChannel()), []);
});

test('numberLine rejects bad ranges, off-line marks, and off-line jumps', () => {
  const backwards = validateSpec(
    withScene(numberLine({min: 10, max: 0})),
    makeChannel(),
  );
  assert.ok(errorsOf(backwards).some((issue) => issue.path.endsWith('min')));

  const offLine = validateSpec(
    withScene(numberLine({marks: [{value: 42}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(offLine).some((issue) => issue.path.includes('marks[0]')));

  const badJump = validateSpec(
    withScene(numberLine({jump: {from: 3, to: 99}})),
    makeChannel(),
  );
  assert.ok(errorsOf(badJump).some((issue) => issue.path.endsWith('jump')));

  const badStep = validateSpec(withScene(numberLine({step: 0})), makeChannel());
  assert.ok(errorsOf(badStep).some((issue) => issue.path.endsWith('step')));
});

test('numberLine warns when ticks get too dense', () => {
  const issues = validateSpec(
    withScene(numberLine({min: 0, max: 100, marks: []})),
    makeChannel(),
  );
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('ticks')));
});

// -------------------------------------------------------- labeledDiagram

const diagram = (overrides = {}) => ({
  type: 'labeledDiagram',
  durationInFrames: 110,
  emoji: '🌻',
  labels: [
    {text: 'Petals', side: 'left'},
    {text: 'Stem', side: 'right'},
  ],
  ...overrides,
});

test('a well-formed labeledDiagram passes', () => {
  assert.deepEqual(validateSpec(withScene(diagram()), makeChannel()), []);
});

test('labeledDiagram requires emoji, labels, and valid sides', () => {
  const noEmoji = validateSpec(withScene(diagram({emoji: ' '})), makeChannel());
  assert.ok(errorsOf(noEmoji).some((issue) => issue.path.endsWith('emoji')));

  const noLabels = validateSpec(withScene(diagram({labels: []})), makeChannel());
  assert.ok(errorsOf(noLabels).some((issue) => issue.path.endsWith('labels')));

  const badSide = validateSpec(
    withScene(diagram({labels: [{text: 'X', side: 'top'}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(badSide).some((issue) => issue.path.endsWith('side')));
});

// ------------------------------------------------------------- image/clip

const imageScene = (overrides = {}) => ({
  type: 'image',
  durationInFrames: 100,
  image: {
    src: 'media/samples/dusk-gradient.png',
    credit: 'Studio',
    license: 'original',
  },
  ...overrides,
});

const clipScene = (overrides = {}) => ({
  type: 'videoClip',
  durationInFrames: 84,
  clip: {
    src: 'media/samples/kinetic-sample.mp4',
    credit: 'Studio',
    license: 'original',
  },
  ...overrides,
});

test('well-formed image and videoClip scenes pass', () => {
  assert.deepEqual(validateSpec(withScene(imageScene()), makeChannel()), []);
  assert.deepEqual(validateSpec(withScene(clipScene()), makeChannel()), []);
});

test('visual assets require credit, license, and a real file inside public/', () => {
  const uncredited = validateSpec(
    withScene(imageScene({image: {src: 'media/samples/dusk-gradient.png'}})),
    makeChannel(),
  );
  const paths = errorsOf(uncredited).map((issue) => issue.path);
  assert.ok(paths.some((path) => path.endsWith('image.credit')));
  assert.ok(paths.some((path) => path.endsWith('image.license')));

  const escaped = validateSpec(
    withScene(imageScene({image: {src: '../secret.png', credit: 'X', license: 'x'}})),
    makeChannel(),
  );
  assert.ok(errorsOf(escaped).some((issue) => issue.message.includes('inside public/')));

  const missing = validateSpec(
    withScene(clipScene({clip: {src: 'media/nope.mp4', credit: 'X', license: 'x'}})),
    makeChannel(),
  );
  assert.ok(errorsOf(missing).some((issue) => issue.message.includes('missing public/')));
});

test('videoClip bounds fit, trimBefore, and volume', () => {
  const bad = validateSpec(
    withScene(
      clipScene({
        clip: {
          src: 'media/samples/kinetic-sample.mp4',
          credit: 'X',
          license: 'x',
          fit: 'stretch',
          trimBefore: -3,
          volume: 2,
        },
      }),
    ),
    makeChannel(),
  );
  const paths = errorsOf(bad).map((issue) => issue.path);
  assert.ok(paths.some((path) => path.endsWith('clip.fit')));
  assert.ok(paths.some((path) => path.endsWith('clip.trimBefore')));
  assert.ok(paths.some((path) => path.endsWith('clip.volume')));
});

// ------------------------------------------------------------- algorithm

const algorithm = (overrides = {}) => ({
  type: 'algorithm',
  durationInFrames: 200,
  values: [2, 5, 8, 12],
  code: {lines: ['lo = 0', 'hi = 3', 'mid = (lo + hi) // 2']},
  steps: [
    {atFrame: 10, states: '....', codeLine: 1, pointers: {lo: 0}},
    {atFrame: 60, states: 'xc.g', codeLine: 3, status: 'mid = 1'},
  ],
  ...overrides,
});

test('a well-formed algorithm passes', () => {
  assert.deepEqual(validateSpec(withScene(algorithm()), makeChannel()), []);
});

test('algorithm rejects bad states, order, codeLine, and pointers', () => {
  const shortStates = validateSpec(
    withScene(algorithm({steps: [{atFrame: 10, states: '..'}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(shortStates).some((issue) => issue.path.endsWith('states')));

  const badChars = validateSpec(
    withScene(algorithm({steps: [{atFrame: 10, states: 'abcd'}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(badChars).some((issue) => issue.message.includes('. c f g or x')));

  const outOfOrder = validateSpec(
    withScene(
      algorithm({
        steps: [
          {atFrame: 60, states: '....'},
          {atFrame: 10, states: '....'},
        ],
      }),
    ),
    makeChannel(),
  );
  assert.ok(errorsOf(outOfOrder).some((issue) => issue.message.includes('ascending')));

  const badLine = validateSpec(
    withScene(algorithm({steps: [{atFrame: 10, states: '....', codeLine: 9}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(badLine).some((issue) => issue.path.endsWith('codeLine')));

  const badPointer = validateSpec(
    withScene(algorithm({steps: [{atFrame: 10, states: '....', pointers: {hi: 7}}]})),
    makeChannel(),
  );
  assert.ok(errorsOf(badPointer).some((issue) => issue.path.endsWith('pointers.hi')));
});

test('algorithm warns on code lines too long to fit', () => {
  const issues = validateSpec(
    withScene(algorithm({code: {lines: ['x'.repeat(60)]}, steps: [{atFrame: 10, states: '....'}]})),
    makeChannel(),
  );
  assert.ok(warningsOf(issues).some((issue) => issue.message.includes('46')));
});

// ---------------------------------------------------------------- tokens

const tokens = (overrides = {}) => ({
  type: 'tokens',
  durationInFrames: 130,
  items: [
    {text: 'The', id: 464},
    {text: ' model', id: 2746},
  ],
  ...overrides,
});

test('a well-formed tokens scene passes', () => {
  assert.deepEqual(validateSpec(withScene(tokens()), makeChannel()), []);
});

test('tokens requires text, ids, and a workable flip window', () => {
  const missing = validateSpec(
    withScene(tokens({items: [{text: '', id: 1}, {text: 'ok'}]})),
    makeChannel(),
  );
  const paths = errorsOf(missing).map((issue) => issue.path);
  assert.ok(paths.some((path) => path.endsWith('items[0].text')));
  assert.ok(paths.some((path) => path.endsWith('items[1].id')));

  const late = validateSpec(withScene(tokens({flipAtFrame: 125})), makeChannel());
  assert.ok(warningsOf(late).some((issue) => issue.message.includes('flip and settle')));

  const outside = validateSpec(withScene(tokens({flipAtFrame: 200})), makeChannel());
  assert.ok(errorsOf(outside).some((issue) => issue.path.endsWith('flipAtFrame')));
});

// ----------------------------------------------------------------- meter

const meter = (overrides = {}) => ({
  type: 'meter',
  durationInFrames: 130,
  max: 100,
  to: 80,
  ...overrides,
});

test('a well-formed meter passes', () => {
  assert.deepEqual(validateSpec(withScene(meter()), makeChannel()), []);
});

test('meter bounds max, from, to, and marker', () => {
  const badMax = validateSpec(withScene(meter({max: 0})), makeChannel());
  assert.ok(errorsOf(badMax).some((issue) => issue.path.endsWith('max')));

  const badTo = validateSpec(withScene(meter({to: 150})), makeChannel());
  assert.ok(errorsOf(badTo).some((issue) => issue.path.endsWith('to')));

  const badFrom = validateSpec(withScene(meter({from: -5})), makeChannel());
  assert.ok(errorsOf(badFrom).some((issue) => issue.path.endsWith('from')));

  const badMarker = validateSpec(
    withScene(meter({marker: {value: 500}})),
    makeChannel(),
  );
  assert.ok(errorsOf(badMarker).some((issue) => issue.path.endsWith('marker.value')));
});

// ------------------------------------------------------------------ rail

test('a well-formed rail passes and advances', () => {
  const spec = makeSpec({rail: {stages: ['HOOK', 'MODEL', 'RECAP']}});
  spec.scenes[0].railStage = 0;
  spec.scenes[1].railStage = 1;
  spec.scenes[2].railStage = 2;
  assert.deepEqual(validateSpec(spec, makeChannel()), []);
});

test('rail bounds stages and railStage, and warns on regression', () => {
  const tooFew = validateSpec(
    makeSpec({rail: {stages: ['ONLY']}}),
    makeChannel(),
  );
  assert.ok(errorsOf(tooFew).some((issue) => issue.path === 'rail.stages'));

  const longStage = validateSpec(
    makeSpec({rail: {stages: ['OK', 'A VERY LONG STAGE NAME']}}),
    makeChannel(),
  );
  assert.ok(warningsOf(longStage).some((issue) => issue.message.includes('crowd')));

  const orphan = makeSpec();
  orphan.scenes[1].railStage = 0;
  const orphanIssues = validateSpec(orphan, makeChannel());
  assert.ok(
    errorsOf(orphanIssues).some((issue) => issue.message.includes('declares no rail')),
  );

  const backwards = makeSpec({rail: {stages: ['A', 'B']}});
  backwards.scenes[0].railStage = 1;
  backwards.scenes[1].railStage = 0;
  const backwardsIssues = validateSpec(backwards, makeChannel());
  assert.ok(
    warningsOf(backwardsIssues).some((issue) => issue.message.includes('backwards')),
  );

  const outOfRange = makeSpec({rail: {stages: ['A', 'B']}});
  outOfRange.scenes[0].railStage = 5;
  const rangeIssues = validateSpec(outOfRange, makeChannel());
  assert.ok(
    errorsOf(rangeIssues).some((issue) => issue.message.includes('one of the rail stages')),
  );
});

// -------------------------------------------------------------- carousel

test('stills deliveries warn when scene count exceeds the slide cap', () => {
  const spec = makeSpec({deliveries: ['instagram-carousel']});
  spec.scenes = Array.from({length: 11}, (_, i) => ({
    type: 'callout',
    durationInFrames: 90,
    text: `Slide ${i}`,
    narration: 'A line for this slide read at pace.',
  }));
  const issues = validateSpec(spec, makeChannel());
  assert.ok(
    warningsOf(issues).some((issue) => issue.message.includes('cap at 10')),
  );
});
