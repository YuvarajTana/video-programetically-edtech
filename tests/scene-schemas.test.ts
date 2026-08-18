import assert from 'node:assert/strict';
import test from 'node:test';
import {STUDIO_VIDEOS} from '@video-kit/catalog';
import {DEFAULT_TEMPLATES} from '@video-kit/core/defaults';
import {EditableVideoSpecSchema} from '@video-kit/core/contracts';
import {SCENE_SCHEMAS, SCENE_TYPES, SceneSchema} from '@video-kit/core/spec';
import {SCENES} from '@video-kit/render-kit/scenes';
import {createSpecFromScript} from '@video-kit/core/storyboard';

test('every registered scene type has a schema and a component', () => {
  assert.deepEqual(
    [...SCENE_TYPES].sort(),
    Object.keys(SCENES).sort(),
    'the scene schemas and the render registry disagree',
  );
  for (const type of SCENE_TYPES) {
    assert.ok(SCENE_SCHEMAS[type], `${type} has no schema`);
    assert.equal(typeof SCENES[type], 'function', `${type} has no component`);
  }
});

test('every scene in the committed catalog parses strictly', () => {
  const failures: string[] = [];
  for (const spec of STUDIO_VIDEOS) {
    for (const [index, scene] of spec.scenes.entries()) {
      const result = SceneSchema.safeParse(scene);
      if (result.success) continue;
      const issue = result.error.issues[0];
      failures.push(
        `${spec.channel}/${spec.slug} scene[${index}] (${scene.type}): ` +
          `${issue.path.join('.')} ${issue.message}`,
      );
    }
  }
  assert.deepEqual(failures, []);
});

test('scenes the studio generates from a script parse strictly', () => {
  for (const template of DEFAULT_TEMPLATES) {
    const spec = createSpecFromScript({
      title: 'Schema check',
      categoryId: 'tech',
      template,
      locale: 'en-US',
      deliveries: ['youtube-long'],
      script: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
    });
    for (const [index, scene] of spec.scenes.entries()) {
      const result = SceneSchema.safeParse(scene);
      assert.ok(
        result.success,
        `${template.id} scene[${index}] (${scene.type}) failed: ` +
          (result.success ? '' : result.error.issues[0].message),
      );
    }
  }
});

/**
 * Before per-scene schemas, only `title`, `callout` and `motionCanvas` had any
 * body validation. These twelve had none at all on either path — a `code` scene
 * with no `lines` was saved happily and then crashed the renderer at
 * `Code.tsx`'s `scene.lines.length`. Each case here is a body that used to be
 * accepted.
 */
const PREVIOUSLY_UNCHECKED: Record<string, Record<string, unknown>> = {
  arrayViz: {type: 'arrayViz', durationInFrames: 90},
  bigStat: {type: 'bigStat', durationInFrames: 90},
  code: {type: 'code', durationInFrames: 90},
  colors: {type: 'colors', durationInFrames: 90},
  compare: {type: 'compare', durationInFrames: 90},
  counting: {type: 'counting', durationInFrames: 90},
  flashcards: {type: 'flashcards', durationInFrames: 90},
  flow: {type: 'flow', durationInFrames: 90},
  outro: {type: 'outro', durationInFrames: 90, recap: 'not an array'},
  stats: {type: 'stats', durationInFrames: 90},
  steps: {type: 'steps', durationInFrames: 90},
  terminal: {type: 'terminal', durationInFrames: 90},
};

for (const [type, scene] of Object.entries(PREVIOUSLY_UNCHECKED)) {
  test(`a malformed ${type} scene is rejected`, () => {
    assert.equal(
      SceneSchema.safeParse(scene).success,
      false,
      `${type} accepted a body with its required fields missing`,
    );
  });
}

test('unknown scene fields are rejected rather than persisted', () => {
  const withJunk = {
    type: 'callout',
    durationInFrames: 90,
    text: 'Real text',
    typoedFeild: 'silently stored before',
  };
  assert.equal(SceneSchema.safeParse(withJunk).success, false);
});

test('a quiz answer must point at one of its options', () => {
  const base = {
    type: 'quiz',
    durationInFrames: 90,
    question: 'Which one?',
    options: [{label: 'A'}, {label: 'B'}],
  };
  assert.equal(SceneSchema.safeParse({...base, answerIndex: 1}).success, true);
  assert.equal(SceneSchema.safeParse({...base, answerIndex: 3}).success, false);
});

test('a whole spec with a bad scene no longer parses', () => {
  const spec = {
    channel: 'tech',
    slug: 'broken',
    title: 'Broken',
    template: 'concept-explainer',
    deliveries: ['youtube-long'],
    fps: 30,
    captions: true,
    scenes: [
      {type: 'code', durationInFrames: 90},
      {type: 'quiz', durationInFrames: 90},
      {type: 'architecture', durationInFrames: 90, junk: 'yes'},
    ],
  };
  assert.equal(EditableVideoSpecSchema.safeParse(spec).success, false);
});
