import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_COMPOSITION_IDS,
  compositionId,
  parseCompositionId,
} from '@video-kit/core/output';
import {
  ASPECTS,
  LEGACY_DELIVERY_VARIANTS,
  OUTPUT_VARIANTS,
  variantById,
  variantsFor,
} from '@video-kit/core/output';
import {DELIVERIES} from '@video-kit/core/publishing';
import {getChannel} from '@video-kit/core/channels';

test('every variant names a known aspect and a coherent artifact', () => {
  for (const [id, variant] of Object.entries(OUTPUT_VARIANTS)) {
    assert.equal(variant.id, id, `${id} disagrees with its registry key`);
    assert.ok(ASPECTS[variant.aspect], `${id} names unknown aspect ${variant.aspect}`);
    assert.ok(variant.artifact.filenameStem, `${id} has no filename stem`);
    assert.ok(variant.artifact.mimeType.includes('/'), `${id} has no mime type`);
  }
});

test('documents derive from a variant that actually renders frames', () => {
  for (const variant of Object.values(OUTPUT_VARIANTS)) {
    if (variant.kind !== 'document') continue;
    const source = variantById(variant.from);
    assert.notEqual(
      source.kind,
      'document',
      `${variant.id} derives from another document`,
    );
  }
});

test('the legacy delivery table is total and resolves', () => {
  for (const deliveryId of Object.keys(DELIVERIES)) {
    const variants = LEGACY_DELIVERY_VARIANTS[deliveryId as keyof typeof LEGACY_DELIVERY_VARIANTS];
    assert.ok(variants?.length, `no variants mapped for delivery ${deliveryId}`);
    for (const id of variants) variantById(id);
  }
});

test('a spec keeps its pre-registry outputs when it only declares deliveries', () => {
  const channel = getChannel('tech');
  const variants = variantsFor({deliveries: ['youtube-long']}, channel);
  assert.deepEqual(
    variants.map((variant) => variant.id).sort(),
    ['youtube-long', 'youtube-long-cover'],
  );
});

test('carousel deliveries now produce slides, a PDF, and a cover', () => {
  const channel = getChannel('tech');
  const variants = variantsFor({deliveries: ['instagram-carousel']}, channel);
  assert.deepEqual(variants.map((variant) => variant.id).sort(), [
    'instagram-carousel-cover',
    'instagram-carousel-pdf',
    'instagram-carousel-slides',
  ]);
});

test('explicit outputs win over deliveries', () => {
  const channel = getChannel('tech');
  const variants = variantsFor(
    {deliveries: ['youtube-long'], outputs: ['loop-gif', 'poster']},
    channel,
  );
  assert.deepEqual(variants.map((variant) => variant.id), ['loop-gif', 'poster']);
});

test('two variants may share one aspect', () => {
  assert.equal(OUTPUT_VARIANTS['youtube-short'].aspect, 'portrait');
  assert.equal(OUTPUT_VARIANTS['instagram-reel'].aspect, 'portrait');
  assert.notEqual(
    OUTPUT_VARIANTS['youtube-short'].artifact.filenameStem,
    OUTPUT_VARIANTS['instagram-reel'].artifact.filenameStem,
  );
});

test('composition ids round-trip and cover the whole grid', () => {
  for (const id of ALL_COMPOSITION_IDS) {
    const parsed = parseCompositionId(id);
    assert.ok(parsed, `${id} did not parse`);
    assert.equal(compositionId(parsed), id);
  }
  assert.equal(parseCompositionId('tech--selection-sort--portrait'), null);
  assert.equal(ALL_COMPOSITION_IDS.length, Object.keys(ASPECTS).length * 2);
});

test('every variant an existing channel default asks for is renderable', () => {
  for (const channelId of ['tech', 'learn', 'fun']) {
    const channel = getChannel(channelId);
    assert.ok(variantsFor({}, channel).length > 0, `${channelId} resolves no variants`);
  }
});
