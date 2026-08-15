import assert from 'node:assert/strict';
import test from 'node:test';
import {EditableVideoSpecSchema} from '../shared/contracts';
import {MOTION_EXPLAINER_SECONDS} from '../shared/durations';
import {SCENES} from '../src/scenes/registry';
import {resolveMotionCanvasTiming} from '../src/timing/wordTimings';
import {embeddingsMotionExplainer} from '../src/videos/tech/embeddings-motion-explainer';
import {ragIn60Seconds} from '../src/videos/tech/rag-in-60-seconds';

test('motion explainer runtimes include the reference thirty-three-second format', () => {
  assert.deepEqual(MOTION_EXPLAINER_SECONDS, [30, 33, 45, 60]);
});

test('dynamic motion primitives validate for RAG', () => {
  EditableVideoSpecSchema.parse(ragIn60Seconds);
  const scene = ragIn60Seconds.scenes[0];
  assert.equal(scene.type, 'motionCanvas');
  assert.equal(scene.motion?.intensity, 'dynamic');
  assert.ok(scene.actions.some((action) => action.type === 'travel'));
  assert.ok(scene.actions.some((action) => action.type === 'pulse'));
  assert.equal(scene.durationInFrames, 1_800);
});

test('the progressive motion canvas is registered and validates', () => {
  assert.equal(typeof SCENES.motionCanvas, 'function');
  const parsed = EditableVideoSpecSchema.parse(embeddingsMotionExplainer);
  assert.equal(parsed.scenes.length, 1);
  assert.equal(parsed.scenes[0].type, 'motionCanvas');
  assert.equal(parsed.scenes[0].durationInFrames, 990);
  assert.equal(embeddingsMotionExplainer.voice?.speed, 1);
  assert.equal(embeddingsMotionExplainer.voice?.maxSpeed, 1);
  assert.equal(embeddingsMotionExplainer.captions, true);
  assert.match(embeddingsMotionExplainer.audio ?? '', /master\.wav$/);
  assert.match(embeddingsMotionExplainer.captionTimings ?? '', /words\.json$/);
});

test('narration phrase anchors resolve to scene-relative frames', () => {
  const resolved = resolveMotionCanvasTiming(embeddingsMotionExplainer, {
    schemaVersion: 1,
    durationSeconds: 33,
    cues: [
      {
        index: 1,
        start: 0,
        end: 33,
        text: 'You search for money back.',
        words: [
          {text: 'You', start: 1, end: 1.2},
          {text: 'search', start: 1.2, end: 1.5},
          {text: 'for', start: 1.5, end: 1.7},
          {text: 'money', start: 2, end: 2.3},
          {text: 'back.', start: 2.3, end: 2.6},
        ],
      },
    ],
  });
  const scene = resolved.scenes[0];
  assert.equal(scene.type, 'motionCanvas');
  assert.equal(scene.actions[0].atFrame, 24);
  assert.equal(scene.actions[1].atFrame, 57);
  assert.equal(scene.actions[2].atFrame, 60, 'unresolved anchors retain fallback frames');
});

test('motion canvas validation rejects anchors absent from narration', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.actions[0].anchor = {phrase: 'not in the approved narration'};
  assert.throws(() =>
    EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]}),
  );
});

test('motion canvas validation rejects unknown action targets', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.actions.push({
    target: 'missing-element',
    type: 'reveal',
    atFrame: 10,
  });
  assert.throws(() =>
    EditableVideoSpecSchema.parse({
      ...embeddingsMotionExplainer,
      scenes: [scene],
    }),
  );
});

test('motion canvas validation rejects cues outside the scene timeline', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.actions.push({
    target: 'cta',
    type: 'reveal',
    atFrame: scene.durationInFrames,
  });
  assert.throws(() =>
    EditableVideoSpecSchema.parse({
      ...embeddingsMotionExplainer,
      scenes: [scene],
    }),
  );
});

test('motion canvas accepts managed PNG photos with deterministic camera motion', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.elements.push({
    id: 'photo-example',
    kind: 'image',
    src: 'generated/project-assets/123e4567-e89b-12d3-a456-426614174000/photo.png',
    alt: 'A learner using a laptop',
    x: 50,
    y: 55,
    width: 72,
    height: 48,
    fit: 'cover',
    radius: 24,
    motion: 'ken-burns-in',
    focalX: 50,
    focalY: 42,
  });
  scene.actions.push({
    target: 'photo-example',
    type: 'reveal',
    atFrame: 12,
    durationFrames: 18,
  });
  EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]});
});

test('motion canvas accepts typed code cards for programming explainers', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.elements.push({
    id: 'code-example',
    kind: 'code',
    code: 'values = (n * n for n in data)',
    label: 'generator expression',
    x: 50,
    y: 50,
    width: 88,
    typewriter: true,
  });
  scene.actions.push({target: 'code-example', type: 'reveal', atFrame: 8});
  EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]});
});

test('motion canvas accepts semantic shapes and deterministic animations', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.elements.push(
    {
      id: 'decision-shape',
      kind: 'shape',
      shape: 'diamond',
      label: 'if?',
      sublabel: 'branch at runtime',
      x: 42,
      y: 50,
      width: 14,
      height: 18,
      tone: 'accent',
      animation: 'wobble',
    },
    {
      id: 'database-shape',
      kind: 'shape',
      shape: 'database',
      label: 'rows',
      x: 70,
      y: 50,
      animation: 'breathe',
    },
  );
  scene.actions.push(
    {target: 'decision-shape', type: 'reveal', atFrame: 8},
    {target: 'decision-shape', type: 'spin', atFrame: 30, durationFrames: 24},
    {target: 'database-shape', type: 'reveal', atFrame: 50},
    {target: 'database-shape', type: 'bounce', atFrame: 70, durationFrames: 20},
  );
  EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]});
});

test('motion canvas supports narration-anchored line-by-line code execution', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.elements.push({
    id: 'runtime-example',
    kind: 'code',
    code: 'items = [2, 4]\nfirst = items[0]\nprint(first)',
    label: 'runtime trace',
    x: 50,
    y: 50,
    width: 88,
    lineNumbers: true,
  });
  scene.actions.push(
    {target: 'runtime-example', type: 'reveal', atFrame: 4},
    {
      target: 'runtime-example',
      type: 'focus-line',
      line: 1,
      note: 'Python creates the list object.',
      atFrame: 12,
    },
    {
      target: 'runtime-example',
      type: 'execute-line',
      line: 2,
      output: 'first = 2',
      atFrame: 42,
    },
  );
  EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]});

  const invalid = structuredClone(scene);
  invalid.actions.push({
    target: 'runtime-example',
    type: 'execute-line',
    line: 9,
    atFrame: 80,
  });
  assert.throws(() =>
    EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [invalid]}),
  );
});

test('motion canvas accepts advanced themes and seek-safe effect presets', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.style = 'electric-grid';
  scene.effects = {
    camera: 'drift',
    particles: 'data-stream',
    glow: 'strong',
    scanlines: true,
    vignette: true,
  };
  EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]});

  const invalid = structuredClone(scene) as unknown as {style: string};
  invalid.style = 'random-theme';
  assert.throws(() =>
    EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [invalid]}),
  );
});

test('motion canvas rejects unsafe or unsupported image paths', () => {
  const scene = structuredClone(embeddingsMotionExplainer.scenes[0]);
  assert.equal(scene.type, 'motionCanvas');
  scene.elements.push({
    id: 'unsafe-photo',
    kind: 'image',
    src: 'generated/../../Desktop/photo.png',
    alt: 'Unsafe photo',
    x: 50,
    y: 50,
  });
  scene.actions.push({target: 'unsafe-photo', type: 'reveal', atFrame: 5});
  assert.throws(() =>
    EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [scene]}),
  );

  const unsupported = structuredClone(scene);
  const image = unsupported.elements.at(-1);
  assert.ok(image && image.kind === 'image');
  image.src = 'images/photo.svg';
  assert.throws(() =>
    EditableVideoSpecSchema.parse({...embeddingsMotionExplainer, scenes: [unsupported]}),
  );
});
