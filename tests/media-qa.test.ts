import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzeMediaProbe} from '../packages/cli/src/media-qa.mjs';

test('media QA accepts synchronized audio and video streams', () => {
  const report = analyzeMediaProbe(
    {
      streams: [
        {codec_type: 'video', codec_name: 'h264', duration: '60.000', width: 1080, height: 1920},
        {codec_type: 'audio', codec_name: 'aac', duration: '60.018'},
      ],
      format: {duration: '60.018'},
    },
    {expectedDurationSeconds: 60, requireAudio: true},
  );
  assert.equal(report.valid, true);
  assert.deepEqual(report.issues, []);
});

test('media QA rejects the reference failure where audio outlives video', () => {
  const report = analyzeMediaProbe(
    {
      streams: [
        {codec_type: 'video', codec_name: 'h264', duration: '40.023'},
        {codec_type: 'audio', codec_name: 'aac', duration: '120.023'},
      ],
      format: {duration: '120.023'},
    },
    {expectedDurationSeconds: 120, requireAudio: true},
  );
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.includes('video stream is 40.023s')));
  assert.ok(report.issues.some((issue) => issue.includes('differ by 80.000s')));
});

test('media QA rejects a missing required narration stream', () => {
  const report = analyzeMediaProbe(
    {
      streams: [{codec_type: 'video', duration: '30.000'}],
      format: {duration: '30.000'},
    },
    {expectedDurationSeconds: 30, requireAudio: true},
  );
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes('missing required audio stream'));
});
