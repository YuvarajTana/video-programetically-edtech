import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  DELIVERIES,
  matchesRef,
  positionals,
  preferredRenderProfile,
  refOf,
} from '../packages/cli/src/deliveries.mjs';

const channel = {defaultDeliveries: ['youtube-long', 'instagram-reel']};

test('every delivery maps to a render profile', () => {
  for (const delivery of Object.values(DELIVERIES)) {
    assert.ok(
      ['landscape', 'portrait', 'square', 'carousel'].includes(delivery.renderProfile),
    );
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

// Composition ids are no longer classified by counting "--" segments; the typed
// helpers in @video-kit/core/output are covered by tests/output-variants.test.ts.
