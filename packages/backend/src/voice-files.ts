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

export const ingestVoiceSample = async ({
  repository,
  profileId,
  purpose,
  locale,
  transcript,
  mimeType,
  data,
}: {
  repository: Repository;
  profileId: string;
  purpose: 'consent' | 'reference';
  locale: string;
  transcript: string;
  mimeType: string;
  data: Buffer;
}) => {
  const profile = await repository.getVoiceProfile(profileId);
  SupportedLocaleSchema.parse(locale);
  if (!ALLOWED_AUDIO.has(mimeType)) {
    throw new Error('Unsupported audio type. Upload WAV, MP3, MP4, WebM, or OGG.');
  }
  if (data.length < 1_000 || data.length > 12 * 1024 * 1024) {
    throw new Error('Voice recordings must be between 1 KB and 12 MB.');
  }
  const directory = resolve(paths.managed(), 'voices', profileId);
  const root = resolve(paths.managed(), 'voices');
  if (!directory.startsWith(`${root}${sep}`)) {
    throw new Error('Invalid voice profile storage path.');
  }
  mkdirSync(directory, {recursive: true, mode: 0o700});
  const id = randomUUID();
  const raw = join(directory, `${id}.upload`);
  const normalized = join(directory, `${id}.wav`);
  writeFileSync(raw, data, {mode: 0o600});
  try {
    run('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      raw,
      '-ac',
      '1',
      '-ar',
      '24000',
      '-af',
      'highpass=f=60,loudnorm=I=-18:TP=-2:LRA=7',
      normalized,
    ]);
  } finally {
    rmSync(raw, {force: true});
  }
  chmodSync(normalized, 0o600);
  const durationText = run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    normalized,
  ]).trim();
  const durationSeconds = Number(durationText);
  const volume = run('ffmpeg', [
    '-hide_banner',
    '-i',
    normalized,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);
  const maxVolume = Number(
    volume.match(/max_volume:\s*(-?[\d.]+)\s*dB/)?.[1] ?? Number.NaN,
  );
  const meanVolume = Number(
    volume.match(/mean_volume:\s*(-?[\d.]+)\s*dB/)?.[1] ?? Number.NaN,
  );
  const issues: string[] = [];
  const shortReference =
    purpose === 'reference' &&
    (profile.activeVersion?.provider === 'f5tts' ||
      profile.activeVersion?.provider === 'chatterbox');
  const [minimum, maximum] =
    purpose === 'reference'
      ? shortReference
        ? [6, 15]
        : [20, 60]
      : [2, 30];
  if (!Number.isFinite(durationSeconds)) {
    issues.push('Audio duration could not be measured.');
  } else if (durationSeconds < minimum || durationSeconds > maximum) {
    issues.push(
      `${shortReference ? 'Local voice reference' : purpose === 'reference' ? 'Reference' : 'Consent'} audio must be ${minimum}–${maximum} seconds.`,
    );
  }
  if (Number.isFinite(maxVolume) && maxVolume > -0.1) {
    issues.push('Audio is clipping. Record again with more microphone distance.');
  }
  if (Number.isFinite(meanVolume) && meanVolume < -42) {
    issues.push('Audio is too quiet for a reliable voice reference.');
  }
  const checksum = createHash('sha256')
    .update(readFileSync(normalized))
    .digest('hex');
  return await repository.addVoiceSample({
    profileId,
    purpose,
    locale,
    transcript,
    path: normalized,
    mimeType: 'audio/wav',
    checksum,
    sizeBytes: data.length,
    durationSeconds: Number.isFinite(durationSeconds)
      ? durationSeconds
      : null,
    issues,
  });
};
