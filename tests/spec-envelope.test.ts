import assert from 'node:assert/strict';
import test from 'node:test';
import {EditableVideoSpecSchema} from '@video-kit/core/contracts';
import {OUTPUT_VARIANTS, variantsFor} from '@video-kit/core/output';
import type {VideoSpec} from '@video-kit/core/spec';

const base = {
  channel: 'tech',
  slug: 'envelope',
  title: 'Envelope',
  template: 'concept-explainer',
  deliveries: ['youtube-long'],
  scenes: [{type: 'callout', durationInFrames: 90, text: 'A line.'}],
};

/**
 * `outputs` and `rail` were absent from the schema while present on VideoSpec,
 * and a plain z.object strips what it does not declare. So both were silently
 * dropped on every save, on every read, and again in the job pipeline before
 * `variantsFor` ever ran — which is why no studio project could select a
 * poster, a GIF, or any variant beyond the five legacy delivery packages.
 */
test('an explicit output selection survives the contract', () => {
  const parsed = EditableVideoSpecSchema.parse({
    ...base,
    outputs: ['poster', 'loop-gif'],
  });
  assert.deepEqual(parsed.outputs, ['poster', 'loop-gif']);
});

test('a selected variant is what actually gets produced', () => {
  const spec = EditableVideoSpecSchema.parse({
    ...base,
    outputs: ['poster', 'loop-gif'],
  }) as VideoSpec;
  const variants = variantsFor(spec, {defaultDeliveries: ['youtube-long']});
  assert.deepEqual(
    variants.map((variant) => variant.id),
    ['poster', 'loop-gif'],
    'the render stage would not have produced the chosen variants',
  );
});

test('no selection still means the delivery defaults, not nothing', () => {
  const spec = EditableVideoSpecSchema.parse(base) as VideoSpec;
  const variants = variantsFor(spec, {defaultDeliveries: ['youtube-long']});
  assert.deepEqual(
    variants.map((variant) => variant.id),
    ['youtube-long', 'youtube-long-cover'],
  );
  // An empty array must behave the same as an absent one; treating it as
  // "produce nothing" would make the picker's initial state silently break
  // every job queued from it.
  const emptied = EditableVideoSpecSchema.parse({...base, outputs: []}) as VideoSpec;
  assert.deepEqual(
    variantsFor(emptied, {defaultDeliveries: ['youtube-long']}).map((v) => v.id),
    ['youtube-long', 'youtube-long-cover'],
  );
});

test('every registered variant id is accepted by the contract', () => {
  // The schema is built from the registry, so registering a variant must be
  // enough to make it selectable. If these ever diverge, a variant exists that
  // no project can ask for.
  for (const id of Object.keys(OUTPUT_VARIANTS)) {
    assert.equal(
      EditableVideoSpecSchema.safeParse({...base, outputs: [id]}).success,
      true,
      `${id} is registered but the contract rejects it`,
    );
  }
  assert.equal(
    EditableVideoSpecSchema.safeParse({...base, outputs: ['not-a-variant']}).success,
    false,
  );
});

test('a rail survives the contract, so railStage can point at something', () => {
  const parsed = EditableVideoSpecSchema.parse({
    ...base,
    rail: {stages: ['Ingest', 'Embed', 'Retrieve']},
    scenes: [{type: 'callout', durationInFrames: 90, text: 'A line.', railStage: 1}],
  });
  assert.deepEqual(parsed.rail?.stages, ['Ingest', 'Embed', 'Retrieve']);
  assert.equal(parsed.scenes[0].railStage, 1);
});

test('the rail bounds match the editorial rule that checks them', () => {
  const withStages = (stages: string[]) =>
    EditableVideoSpecSchema.safeParse({...base, rail: {stages}}).success;
  assert.equal(withStages(['One']), false, 'a one-stage rail was accepted');
  assert.equal(withStages(Array.from({length: 9}, (_, i) => `S${i}`)), false);
  assert.equal(withStages(['A'.repeat(17), 'Two']), false, 'an over-long stage label was accepted');
  assert.equal(withStages(['Ingest', 'Embed']), true);
});
