import assert from 'node:assert/strict';
import {test} from 'node:test';
import {toSrt, toVoScript} from '../scripts/captions-lib.mjs';

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

test('toVoScript lists every scene with timing', () => {
  const script = toVoScript(spec, 30);
  assert.ok(script.includes('# Sample — voiceover script'));
  assert.ok(script.includes('| 1 | title | 0.0s | 3.0s | Hello there. |'));
  assert.ok(script.includes('| 2 | steps | 3.0s | 2.0s | — |'));
  assert.ok(script.includes('| 3 | outro | 5.0s | 1.5s | Goodbye. |'));
});
