import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateSpec} from '../scripts/validation-lib.mjs';
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
