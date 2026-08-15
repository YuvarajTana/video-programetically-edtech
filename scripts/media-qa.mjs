#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const finiteDuration = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const analyzeMediaProbe = (
  probe,
  {expectedDurationSeconds, requireAudio = false, toleranceSeconds = 0.2} = {},
) => {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  const formatDuration = finiteDuration(probe?.format?.duration);
  const videoDuration = finiteDuration(video?.duration) ?? formatDuration;
  const audioDuration = finiteDuration(audio?.duration);
  const issues = [];

  if (!video) issues.push('missing video stream');
  if (requireAudio && !audio) issues.push('missing required audio stream');
  if (!videoDuration) issues.push('video duration could not be measured');

  if (
    videoDuration &&
    Number.isFinite(expectedDurationSeconds) &&
    Math.abs(videoDuration - expectedDurationSeconds) > toleranceSeconds
  ) {
    issues.push(
      `video stream is ${videoDuration.toFixed(3)}s; expected ${Number(expectedDurationSeconds).toFixed(3)}s`,
    );
  }
  if (
    audioDuration &&
    Number.isFinite(expectedDurationSeconds) &&
    Math.abs(audioDuration - expectedDurationSeconds) > toleranceSeconds
  ) {
    issues.push(
      `audio stream is ${audioDuration.toFixed(3)}s; expected ${Number(expectedDurationSeconds).toFixed(3)}s`,
    );
  }
  if (
    videoDuration &&
    audioDuration &&
    Math.abs(videoDuration - audioDuration) > toleranceSeconds
  ) {
    issues.push(
      `audio/video streams differ by ${Math.abs(videoDuration - audioDuration).toFixed(3)}s`,
    );
  }

  return {
    valid: issues.length === 0,
    expectedDurationSeconds: Number.isFinite(expectedDurationSeconds)
      ? Number(expectedDurationSeconds)
      : null,
    formatDurationSeconds: formatDuration,
    videoDurationSeconds: videoDuration,
    audioDurationSeconds: audioDuration,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    width: Number(video?.width) || null,
    height: Number(video?.height) || null,
    issues,
  };
};

export const probeMediaFile = (path) => {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=index,codec_type,codec_name,duration,width,height,r_frame_rate,sample_rate,channels',
      '-of',
      'json',
      path,
    ],
    {encoding: 'utf8'},
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `ffprobe stopped with ${result.status}`);
  }
  return JSON.parse(result.stdout);
};

export const assertMediaFile = (path, options) => {
  const report = analyzeMediaProbe(probeMediaFile(path), options);
  if (!report.valid) {
    throw new Error(`Media QA failed for ${path}: ${report.issues.join('; ')}`);
  }
  return report;
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const argv = process.argv.slice(2);
  const path = argv.find((argument) => !argument.startsWith('--'));
  const expectedIndex = argv.indexOf('--expected');
  const expectedDurationSeconds =
    expectedIndex >= 0 ? Number(argv[expectedIndex + 1]) : undefined;
  if (!path || (expectedIndex >= 0 && !Number.isFinite(expectedDurationSeconds))) {
    console.error(
      'usage: node scripts/media-qa.mjs <video.mp4> [--expected seconds] [--require-audio]',
    );
    process.exit(2);
  }
  try {
    const report = assertMediaFile(path, {
      expectedDurationSeconds,
      requireAudio: argv.includes('--require-audio'),
    });
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
