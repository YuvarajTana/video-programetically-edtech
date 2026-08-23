import {paths} from '@video-kit/core/config';
import {createHash, randomUUID} from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {SupportedLocaleSchema} from '@video-kit/core/languages';
import type {Repository} from '@video-kit/datasource';

const ALLOWED_AUDIO = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
]);

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: paths.root,
    encoding: 'utf8',
    maxBuffer: 2_000_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed: ${result.stderr || result.stdout}`.slice(0, 2_000),
    );
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
};

export const ingestNarrationAsset = async ({
  repository,
  label,
  locale,
  originalFilename,
  mimeType,
  data,
}: {
  repository: Repository;
  label: string;
  locale: string;
  originalFilename: string;
  mimeType: string;
  data: Buffer;
}) => {
  SupportedLocaleSchema.parse(locale);
  if (!ALLOWED_AUDIO.has(mimeType)) {
    throw new Error('Unsupported audio type. Upload WAV, MP3, MP4, WebM, or OGG.');
  }
  if (data.length < 1_000 || data.length > 384 * 1024 * 1024) {
    throw new Error('Narration audio must be between 1 KB and 384 MB.');
  }
  const root = resolve(paths.managed(), 'narrations');
  const id = randomUUID();
  const directory = resolve(root, id);
  if (!directory.startsWith(`${root}${sep}`)) {
    throw new Error('Invalid narration storage path.');
  }
  mkdirSync(directory, {recursive: true, mode: 0o700});
  const raw = join(directory, 'source.upload');
  const normalized = join(directory, 'master.wav');
  writeFileSync(raw, data, {mode: 0o600});
  try {
    run('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      raw,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '48000',
      '-af',
      'loudnorm=I=-16:TP=-1.5:LRA=8',
      normalized,
    ]);
  } finally {
    rmSync(raw, {force: true});
  }
  chmodSync(normalized, 0o600);
  const durationSeconds = Number(
    run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      normalized,
    ]).trim(),
  );
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 1_800) {
    rmSync(directory, {recursive: true, force: true});
    throw new Error('Narration must be between 1 second and 30 minutes.');
  }
  const checksum = createHash('sha256')
    .update(readFileSync(normalized))
    .digest('hex');
  return await repository.addNarrationAsset({
    label,
    locale,
    originalFilename,
    path: normalized,
    mimeType: 'audio/wav',
    durationSeconds,
    checksum,
    sizeBytes: data.length,
    usage: 'finished',
  });
};
