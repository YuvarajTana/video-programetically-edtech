import assert from 'node:assert/strict';
import test from 'node:test';
import {buildMasterTimeline} from '../shared/master-timeline.mjs';
import {
  PRODUCTION_PIPELINE,
  productionStageIndex,
  productionStageLabel,
} from '../shared/pipeline';
import {embeddingsMotionExplainer} from '../src/videos/tech/embeddings-motion-explainer';

test('the canonical pipeline matches the master-timeline production order', () => {
  assert.deepEqual(
    PRODUCTION_PIPELINE.map((stage) => stage.id),
    [
      'topic',
      'script',
      'scene-breakdown',
      'tts',
      'timestamps',
      'timeline',
      'composition',
      'audio',
      'render',
      'qa',
    ],
  );
  assert.equal(productionStageLabel('voice'), 'TTS generation');
  assert.equal(productionStageIndex('captions'), 4);
});

test('master timeline freezes narration anchors and parallel tracks to frames', () => {
  const result = buildMasterTimeline({
    spec: embeddingsMotionExplainer,
    locale: 'en-US',
    audioMode: 'voiceover',
    timings: {
      schemaVersion: 1,
      durationSeconds: 33,
      cues: [{
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
      }],
    },
  });

  assert.equal(result.timeline.durationInFrames, 990);
  assert.equal(result.timeline.tracks.visuals.length, 1);
  assert.equal(result.timeline.tracks.captions.length, 1);
  assert.equal(result.timeline.tracks.audio.mode, 'voiceover');
  assert.equal(result.spec.scenes[0].type, 'motionCanvas');
  if (result.spec.scenes[0].type === 'motionCanvas') {
    assert.equal(result.spec.scenes[0].actions[0].atFrame, 24);
    assert.equal(result.timeline.tracks.motion[0].absoluteFrame, 24);
  }
});

test('music-only timelines stay deterministic without spoken cues', () => {
  const spec = structuredClone(embeddingsMotionExplainer);
  spec.audio = undefined;
  spec.captionTimings = undefined;
  spec.captions = false;
  spec.scenes = spec.scenes.map((scene) => ({...scene, narration: undefined}));
  const result = buildMasterTimeline({
    spec,
    locale: 'en-US',
    audioMode: 'music-only',
  });
  assert.equal(result.timeline.tracks.captions.length, 0);
  assert.equal(result.timeline.scenes.length, 1);
  assert.equal(result.timeline.durationSeconds, 33);
});
