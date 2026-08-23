import assert from 'node:assert/strict';
import {test} from 'node:test';
import {toSrt, toVoScript} from '../packages/cli/src/captions-lib.mjs';

const spec = {
  channel: 'tech',
  slug: 'sample',
  title: 'Sample',
  summary: 'A sample.',
  scenes: [
    {type: 'title', durationInFrames: 90, narration: 'Hello there.'},
    {type: 'steps', durationInFrames: 60}, // silent — no cue
    {type: 'outro', durationInFrames: 45, narration: 'Goodbye.'},
  ],
};

test('toSrt numbers cues and skips silent scenes', () => {
  const srt = toSrt(spec, 30);
  const blocks = srt.trim().split('\n\n');
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].startsWith('1\n00:00:00,000 --> 00:00:03,000\nHello there.'));
  assert.ok(blocks[1].startsWith('2\n00:00:05,000 --> 00:00:06,500\nGoodbye.'));
});

test('toVoScript lists every scene with timing and pace', () => {
  const script = toVoScript(spec, 30);
  assert.ok(script.includes('# Sample — voiceover script'));
  assert.ok(script.includes('| 1 | title | 0.0s | 3.0s | 0.7 w/s | Hello there. |'));
  assert.ok(script.includes('| 2 | steps | 3.0s | 2.0s | — | — |'));
  assert.ok(script.includes('| 3 | outro | 5.0s | 1.5s | 0.7 w/s | Goodbye. |'));
});

test('toVoScript flags lines outside the channel pace band', () => {
  const fastSpec = {
    ...spec,
    scenes: [
      {
        type: 'title',
        durationInFrames: 60,
        narration: Array(12).fill('word').join(' '), // 6 w/s
      },
      {type: 'outro', durationInFrames: 300, narration: 'Too slow now.'}, // 0.3 w/s
    ],
  };
  const script = toVoScript(fastSpec, 30, undefined, {min: 130, max: 165});
  assert.ok(script.includes('6.0 w/s ⚠ fast'));
  assert.ok(script.includes('0.3 w/s · slow'));
  assert.ok(script.includes('Target pace: 2.2–2.8 words/second.'));
});

test('mediaCreditsFor includes scene images and clips alongside audio', async () => {
  const {mediaCreditsFor} = await import('../packages/cli/src/package-lib.mjs');
  const credits = mediaCreditsFor({
    soundtrack: {
      music: {src: 'a.wav', credit: 'M', license: 'cc0'},
    },
    scenes: [
      {type: 'image', durationInFrames: 10, image: {src: 'i.png', credit: 'I', license: 'cc-by'}},
      {type: 'videoClip', durationInFrames: 10, clip: {src: 'c.mp4', credit: 'C', license: 'original'}},
      {type: 'title', durationInFrames: 10, title: 'x'},
    ],
  });
  assert.deepEqual(
    credits.map((asset) => [asset.role, asset.credit]),
    [['music', 'M'], ['image', 'I'], ['video-clip', 'C']],
  );
});
