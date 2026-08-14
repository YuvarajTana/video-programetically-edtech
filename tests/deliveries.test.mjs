import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  DELIVERIES,
  coverComposition,
  matchesRef,
  positionals,
  preferredRenderProfile,
  refOf,
  videoComposition,
} from '../scripts/deliveries.mjs';

const channel = {defaultDeliveries: ['youtube-long', 'instagram-reel']};

test('every delivery maps to a render profile', () => {
  for (const delivery of Object.values(DELIVERIES)) {
    assert.ok(['landscape', 'portrait', 'square'].includes(delivery.renderProfile));
  }
});

test('preferredRenderProfile favors portrait when any delivery is vertical', () => {
  assert.equal(preferredRenderProfile({channel: 'tech', slug: 'x'}, channel), 'portrait');
  assert.equal(
    preferredRenderProfile({deliveries: ['youtube-long']}, channel),
    'landscape',
  );
});

test('matchesRef accepts full refs, bare slugs, and empty filters', () => {
  const spec = {channel: 'tech', slug: 'my-video'};
  assert.equal(refOf(spec), 'tech/my-video');
  assert.ok(matchesRef(spec, []));
  assert.ok(matchesRef(spec, ['tech/my-video']));
  assert.ok(matchesRef(spec, ['my-video']));
  assert.ok(!matchesRef(spec, ['learn/my-video', 'other']));
});

test('positionals skips flags and their values', () => {
  assert.deepEqual(
    positionals(['tech/a', '--profile', 'portrait', 'learn/b', '--still'], ['profile']),
    ['tech/a', 'learn/b'],
  );
});

test('composition id classification', () => {
  assert.ok(videoComposition({id: 'tech--slug--portrait'}));
  assert.ok(!videoComposition({id: 'tech--slug--youtube-long--cover'}));
  assert.ok(coverComposition({id: 'tech--slug--youtube-long--cover'}));
  assert.ok(!coverComposition({id: 'tech--slug--portrait'}));
});
