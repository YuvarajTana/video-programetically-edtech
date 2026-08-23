import assert from 'node:assert/strict';
import test from 'node:test';
import {DELIVERIES} from '@video-kit/core/publishing';
import {ASPECT_IDS} from '@video-kit/core/output';
import {
  aspectRatioLabel,
  DELIVERY_CHOICES,
  describeOutputs,
} from '../packages/frontend/src/outputs';

test('the studio offers every delivery, including the ones it used to omit', () => {
  assert.deepEqual(
    DELIVERY_CHOICES.map((choice) => choice.id).sort(),
    Object.keys(DELIVERIES).sort(),
  );
  assert.ok(
    DELIVERY_CHOICES.some((choice) => choice.id === 'instagram-carousel'),
    'the carousel delivery is missing from the picker again',
  );
});

test('every delivery choice knows what it produces', () => {
  for (const choice of DELIVERY_CHOICES) {
    assert.ok(choice.produces.length > 0, `${choice.id} produces nothing`);
  }
});

test('every aspect has a ratio label', () => {
  for (const id of ASPECT_IDS) {
    assert.match(aspectRatioLabel(id), /^\d+:\d+$/, `${id} has no ratio label`);
  }
});

test('the summary names the kinds a selection produces', () => {
  const summary = describeOutputs(['instagram-carousel']);
  assert.match(summary, /still-sequence/);
  assert.match(summary, /document/);
});
