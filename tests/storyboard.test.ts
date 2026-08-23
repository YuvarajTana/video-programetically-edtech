import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_TEMPLATES} from '@video-kit/core/defaults';
import {
  createSpecFromScript,
  scenesExceedNarrationRate,
  splitScript,
} from '@video-kit/core/storyboard';

test('blank-line paragraphs become deterministic template scenes', () => {
  const paragraphs = splitScript(
    'A strong opening.\n\nThe first idea is clear.\n\nThe second idea adds detail.\n\nRemember this.',
  );
  assert.deepEqual(paragraphs, [
    'A strong opening.',
    'The first idea is clear.',
    'The second idea adds detail.',
    'Remember this.',
  ]);
  const spec = createSpecFromScript({
    title: 'A useful concept',
    categoryId: 'tech',
    template: DEFAULT_TEMPLATES[0],
    locale: 'en-US',
    deliveries: ['youtube-long'],
    script: paragraphs.join('\n\n'),
  });
  assert.equal(spec.scenes.length, 4);
  assert.equal(spec.scenes[0].type, 'title');
  assert.equal(spec.scenes[1].type, 'callout');
  assert.equal(spec.scenes[2].type, 'callout');
  assert.equal(spec.scenes[3].type, 'outro');
  assert.equal(spec.scenes[3].narration, 'Remember this.');
});

test('an empty script still creates an editable starter storyboard', () => {
  const spec = createSpecFromScript({
    title: 'Starter',
    categoryId: 'learn',
    template: DEFAULT_TEMPLATES[1],
    locale: 'en-US',
    deliveries: ['youtube-short'],
    script: '',
  });
  assert.equal(spec.scenes.length, 3);
  assert.ok(spec.scenes.every((scene) => scene.durationInFrames > 0));
});

test('the managed code preset creates editable Python code scenes', () => {
  const template = DEFAULT_TEMPLATES.find(
    (entry) => entry.id === 'tech-reel-code',
  );
  assert.ok(template);
  const spec = createSpecFromScript({
    title: 'Async and Await',
    categoryId: 'tech',
    template,
    locale: 'en-US',
    deliveries: ['youtube-short', 'instagram-reel'],
    script:
      'Why does async code wait without blocking?\n\nFirst code example.\n\nSecond code example.\n\nRemember the event loop.',
  });
  assert.equal(spec.scenes[0].type, 'title');
  assert.equal(spec.scenes[1].type, 'code');
  assert.equal(spec.scenes[2].type, 'code');
  assert.equal(spec.scenes[3].type, 'outro');
});

test('a production target rescales the storyboard to an exact runtime', () => {
  const template = DEFAULT_TEMPLATES.find(
    (entry) => entry.id === 'tech-reel-concept',
  );
  assert.ok(template);
  const spec = createSpecFromScript({
    title: 'Python before AI',
    categoryId: 'tech',
    template,
    locale: 'en-US',
    deliveries: ['youtube-short', 'instagram-reel'],
    script: Array.from(
      {length: 8},
      (_, index) => `Narration for visual idea ${index + 1}.`,
    ).join('\n\n'),
    targetSeconds: 60,
  });
  assert.equal(
    spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0),
    60 * 30,
  );
  assert.ok(spec.scenes.every((scene) => scene.durationInFrames >= 15));
});

test('production timing follows narration length instead of fixed slot length', () => {
  const template = DEFAULT_TEMPLATES.find(
    (entry) => entry.id === 'tech-reel-concept',
  );
  assert.ok(template);
  const spec = createSpecFromScript({
    title: 'Balanced narration',
    categoryId: 'tech',
    template,
    locale: 'en-US',
    deliveries: ['instagram-reel'],
    script: [
      'This opening has enough spoken words to need a useful amount of time.',
      'Short idea.',
      'This explanation contains substantially more narration and therefore needs more time on the final timeline than the short idea.',
      'A concise ending.',
    ].join('\n\n'),
    targetSeconds: 60,
  });
  assert.ok(
    spec.scenes[2].durationInFrames > spec.scenes[1].durationInFrames * 3,
  );
  assert.equal(
    spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0),
    1_800,
  );
});

test('pathologically fast scene narration is detected before voice generation', () => {
  const template = DEFAULT_TEMPLATES.find(
    (entry) => entry.id === 'tech-reel-concept',
  );
  assert.ok(template);
  const spec = createSpecFromScript({
    title: 'Decorators',
    categoryId: 'tech',
    template,
    locale: 'en-US',
    deliveries: ['instagram-reel'],
    script:
      'What if you could add logging to a Python function without changing the function itself? That is exactly what decorators do.\n\nA decorator wraps another function.',
  });
  assert.equal(scenesExceedNarrationRate(spec.scenes, 220), true);
});
