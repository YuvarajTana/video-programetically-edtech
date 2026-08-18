#!/usr/bin/env node
/**
 * Generate a normalized local Kokoro voice track for one production video.
 *
 *   npm run voice -- tech/context-vs-harness-engineering
 *   npm run voice -- learn/ten-colors --voice af_sky --speed 0.95
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, parse, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {positionals} from './deliveries.mjs';
import {paths} from '@video-kit/core/config';

const argv = process.argv.slice(2);
const value = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : argv[index + 1];
};
const valueFlags = ['voice', 'speed', 'model', 'language', 'python'];
for (const flag of valueFlags) {
  const index = argv.indexOf(`--${flag}`);
  if (index !== -1 && (!argv[index + 1] || argv[index + 1].startsWith('--'))) {
    console.error(`--${flag} requires a value`);
    process.exit(1);
  }
}
const refs = positionals(argv, valueFlags);

if (argv.includes('--help') || refs.length !== 1) {
  console.log(
    'usage: npm run voice -- <channel>/<slug> [--voice preset] [--speed number] [--model id] [--language code] [--python path] [--force]',
  );
  process.exit(argv.includes('--help') ? 0 : 1);
}

const ref = refs[0];
if (!/^(tech|learn|fun)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref)) {
  console.error('video ref must look like: tech/context-vs-harness-engineering');
  process.exit(1);
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    ...options,
  });
  if (result.error) {
    console.error(`${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    if (options.stdio !== 'inherit') {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
  return result;
};

const availablePython = () => {
  const requested = value('python') ?? process.env.TTS_PYTHON;
  const candidates = [
    requested,
    join('.venv-tts', 'bin', 'python3'),
    join('.venv-tts', 'bin', 'python'),
    'python3',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], {encoding: 'utf8'});
    if (!result.error && result.status === 0) return candidate;
  }

  console.error(
    'no TTS Python found; create .venv-tts or pass --python /path/to/python3',
  );
  process.exit(1);
};

const parseLoudness = (output) => {
  const matches = output.match(/\{\s*"input_i"[\s\S]*?\}/g);
  if (!matches?.length) {
    console.error('ffmpeg did not return loudness measurements');
    process.exit(1);
  }
  return JSON.parse(matches.at(-1));
};

const measureLoudness = (path, config) => {
  const filter = [
    `loudnorm=I=${config.targetLufs}`,
    `TP=${config.truePeakDb}`,
    `LRA=${config.loudnessRange}`,
    'print_format=json',
  ].join(':');
  const result = run('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    path,
    '-af',
    filter,
    '-f',
    'null',
    '-',
  ]);
  return parseLoudness(`${result.stdout}\n${result.stderr}`);
};

const probeDuration = (path) => {
  const result = run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    path,
  ]);
  return Number(result.stdout.trim());
};

console.log(`· captions ${ref}`);
run(process.execPath, ['scripts/captions.mjs', ref], {stdio: 'inherit'});

const [channel, slug] = ref.split('/');
const base = join(paths.out(), channel, slug);
const requestPath = join(base, 'voice.json');
if (!existsSync(requestPath)) {
  console.error(`missing ${requestPath}`);
  process.exit(1);
}

const request = JSON.parse(readFileSync(requestPath, 'utf8'));
if (!request.audioConfigured) {
  console.error(
    `video ${ref} does not declare spec.audio; add audio: '${request.audio}' so Remotion embeds the generated track`,
  );
  process.exit(1);
}
const voice = {
  ...request.voice,
  ...(value('voice') ? {preset: value('voice')} : {}),
  ...(value('model') ? {model: value('model')} : {}),
  ...(value('language') ? {language: value('language')} : {}),
  ...(value('speed') ? {speed: Number(value('speed'))} : {}),
};

if (!Number.isFinite(voice.speed) || voice.speed <= 0) {
  console.error('--speed must be a positive number');
  process.exit(1);
}
if (
  voice.maxSpeed !== undefined &&
  (!Number.isFinite(voice.maxSpeed) || voice.maxSpeed < voice.speed)
) {
  console.error('voice.maxSpeed must be greater than or equal to voice.speed');
  process.exit(1);
}

const publicRoot = paths.public();
const finalPath = resolve(publicRoot, request.audio);
if (!finalPath.startsWith(`${publicRoot}${sep}`)) {
  console.error(`audio path must stay inside public/: ${request.audio}`);
  process.exit(1);
}
const wordTimingsPath = request.wordTimingsConfigured
  ? resolve(publicRoot, request.wordTimings)
  : null;
if (
  wordTimingsPath &&
  !wordTimingsPath.startsWith(`${publicRoot}${sep}`)
) {
  console.error(
    `word timings path must stay inside public/: ${request.wordTimings}`,
  );
  process.exit(1);
}

const finalParts = parse(finalPath);
const rawPath = join(finalParts.dir, `${finalParts.name}-raw.wav`);
const pendingPath = join(finalParts.dir, `${finalParts.name}.pending.wav`);
const pendingWordTimingsPath = wordTimingsPath
  ? join(
      dirname(wordTimingsPath),
      `${parse(wordTimingsPath).name}.pending.json`,
    )
  : null;
mkdirSync(dirname(finalPath), {recursive: true});
if (wordTimingsPath) mkdirSync(dirname(wordTimingsPath), {recursive: true});

const srtPath = join(base, 'captions.srt');
const generatorHash = createHash('sha256')
  .update(readFileSync('scripts/local-tts-from-srt.py'))
  .digest('hex');
const cacheKey = createHash('sha256')
  .update(
    JSON.stringify({
      schemaVersion: 1,
      srt: readFileSync(srtPath, 'utf8'),
      durationSeconds: request.durationSeconds,
      voice,
      generatorHash,
      normalizationVersion: 1,
    }),
  )
  .digest('hex');
const cacheDirectory = resolve(
  process.env.VIDEO_KIT_CACHE_DIR ?? join('.cache', 'video-kit', 'audio'),
);
const cacheAudioPath = join(cacheDirectory, `${cacheKey}.wav`);
const cacheMetadataPath = join(cacheDirectory, `${cacheKey}.json`);
const cacheWordTimingsPath = join(cacheDirectory, `${cacheKey}.words.json`);
mkdirSync(cacheDirectory, {recursive: true});

const verifyAudio = (path) => {
  const loudness = measureLoudness(path, voice);
  const duration = probeDuration(path);
  const loudnessError = Math.abs(Number(loudness.input_i) - voice.targetLufs);
  const durationError = Math.abs(duration - request.durationSeconds);

  if (loudnessError > 0.2) {
    console.error(
      `normalized loudness ${loudness.input_i} LUFS misses target ${voice.targetLufs} LUFS`,
    );
    process.exit(1);
  }
  if (Number(loudness.input_tp) > voice.truePeakDb + 0.2) {
    console.error(
      `true peak ${loudness.input_tp} dBTP exceeds target ${voice.truePeakDb} dBTP`,
    );
    process.exit(1);
  }
  if (durationError > 0.05) {
    console.error(
      `audio duration ${duration.toFixed(3)}s does not match video ${request.durationSeconds.toFixed(3)}s`,
    );
    process.exit(1);
  }

  return {duration, loudness};
};

const verifyWordTimings = (path) => {
  if (!path) return null;
  if (!existsSync(path)) {
    console.error(`missing word timings ${path}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.cues)) {
    console.error(`invalid word timings ${path}`);
    process.exit(1);
  }

  let previous = 0;
  let words = 0;
  for (const cue of data.cues) {
    if (!Array.isArray(cue.words)) {
      console.error(`invalid word timings cue in ${path}`);
      process.exit(1);
    }
    for (const word of cue.words) {
      if (
        !word.text ||
        !Number.isFinite(word.start) ||
        !Number.isFinite(word.end) ||
        word.start < previous - 0.001 ||
        word.end <= word.start ||
        word.end > request.durationSeconds + 0.05
      ) {
        console.error(`invalid word timing in ${path}`);
        process.exit(1);
      }
      previous = word.end;
      words++;
    }
  }
  if (!words) {
    console.error(`word timings contain no words: ${path}`);
    process.exit(1);
  }
  return {cues: data.cues.length, words};
};

const writeAudioReport = ({
  duration,
  loudness,
  correctionDb,
  cacheHit,
  wordTimingStats,
}) => {
  writeFileSync(
    join(base, 'audio.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        ref,
        path: request.audio,
        durationSeconds: duration,
        voice,
        loudness: {
          integratedLufs: Number(loudness.input_i),
          truePeakDb: Number(loudness.input_tp),
          loudnessRange: Number(loudness.input_lra),
          correctionDb: Number(correctionDb.toFixed(3)),
        },
        cache: {
          key: cacheKey,
          hit: cacheHit,
        },
        wordTimings: wordTimingStats
          ? {
              path: request.wordTimings,
              ...wordTimingStats,
            }
          : null,
      },
      null,
      2,
    ),
  );
};

if (
  !argv.includes('--force') &&
  existsSync(cacheAudioPath) &&
  existsSync(cacheMetadataPath) &&
  (!wordTimingsPath || existsSync(cacheWordTimingsPath))
) {
  console.log(`· cache hit ${cacheKey.slice(0, 12)}`);
  const cacheMetadata = JSON.parse(readFileSync(cacheMetadataPath, 'utf8'));
  const verified = verifyAudio(cacheAudioPath);
  const wordTimingStats = verifyWordTimings(
    wordTimingsPath ? cacheWordTimingsPath : null,
  );
  copyFileSync(cacheAudioPath, finalPath);
  if (wordTimingsPath) {
    copyFileSync(cacheWordTimingsPath, wordTimingsPath);
  }
  writeAudioReport({
    ...verified,
    correctionDb: Number(cacheMetadata.correctionDb ?? 0),
    cacheHit: true,
    wordTimingStats,
  });
  console.log(`✓ voice ${ref}`);
  console.log(`  ${request.audio}`);
  console.log(
    `  ${verified.duration.toFixed(2)}s · ${verified.loudness.input_i} LUFS · ${verified.loudness.input_tp} dBTP`,
  );
  process.exit(0);
}

console.log(`· cache miss ${cacheKey.slice(0, 12)}`);
const python = availablePython();
console.log(
  `· tts ${voice.model} ${voice.preset} speed=${voice.speed} language=${voice.language}`,
);
const ttsArgs = [
  'scripts/local-tts-from-srt.py',
  '--srt',
  srtPath,
  '--out',
  rawPath,
  '--voice',
  voice.preset,
  '--speed',
  String(voice.speed),
  '--model',
  voice.model,
  '--language',
  voice.language,
];
if (voice.maxSpeed !== undefined) {
  ttsArgs.push('--max-speed', String(voice.maxSpeed));
}
if (pendingWordTimingsPath) {
  ttsArgs.push('--timings', pendingWordTimingsPath);
}
run(python, ttsArgs, {stdio: 'inherit'});

console.log('· loudness pass 1');
const measured = measureLoudness(rawPath, voice);
const normalizeFilter = [
  `loudnorm=I=${voice.targetLufs}`,
  `TP=${voice.truePeakDb}`,
  `LRA=${voice.loudnessRange}`,
  `measured_I=${measured.input_i}`,
  `measured_TP=${measured.input_tp}`,
  `measured_LRA=${measured.input_lra}`,
  `measured_thresh=${measured.input_thresh}`,
  `offset=${measured.target_offset}`,
  'linear=true',
  'print_format=summary',
].join(':');

console.log('· loudness pass 2');
run(
  'ffmpeg',
  [
    '-y',
    '-hide_banner',
    '-i',
    rawPath,
    '-af',
    normalizeFilter,
    '-ar',
    '48000',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    pendingPath,
  ],
  {stdio: 'inherit'},
);

let finalLoudness = measureLoudness(pendingPath, voice);
let correctionDb = 0;
let loudnessError = Math.abs(Number(finalLoudness.input_i) - voice.targetLufs);

// True-peak protection can cause loudnorm to land below its integrated target
// for peaky synthetic speech. Apply a bounded gain correction through a
// look-ahead limiter, then verify the actual output again.
if (loudnessError > 0.2) {
  correctionDb = voice.targetLufs - Number(finalLoudness.input_i);
  if (Math.abs(correctionDb) > 6) {
    console.error(
      `normalization needs ${correctionDb.toFixed(2)} dB of correction; refusing to apply more than 6 dB`,
    );
    process.exit(1);
  }

  const correctedPath = join(
    finalParts.dir,
    `${finalParts.name}.corrected.pending.wav`,
  );
  const limiter = 10 ** (voice.truePeakDb / 20);
  console.log(`· loudness correction ${correctionDb.toFixed(2)} dB`);
  run(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-i',
      pendingPath,
      '-af',
      `volume=${correctionDb.toFixed(3)}dB,alimiter=limit=${limiter.toFixed(6)}:attack=5:release=50:level=false`,
      '-ar',
      '48000',
      '-ac',
      '2',
      '-c:a',
      'pcm_s16le',
      correctedPath,
    ],
    {stdio: 'inherit'},
  );
  finalLoudness = measureLoudness(correctedPath, voice);
  loudnessError = Math.abs(
    Number(finalLoudness.input_i) - voice.targetLufs,
  );
  renameSync(correctedPath, pendingPath);
}

const verified = verifyAudio(pendingPath);
const wordTimingStats = verifyWordTimings(pendingWordTimingsPath);
renameSync(pendingPath, finalPath);
if (wordTimingsPath && pendingWordTimingsPath) {
  renameSync(pendingWordTimingsPath, wordTimingsPath);
}
const cacheAudioPendingPath = `${cacheAudioPath}.pending`;
const cacheMetadataPendingPath = `${cacheMetadataPath}.pending`;
copyFileSync(finalPath, cacheAudioPendingPath);
if (wordTimingsPath) {
  copyFileSync(wordTimingsPath, `${cacheWordTimingsPath}.pending`);
}
writeFileSync(
  cacheMetadataPendingPath,
  JSON.stringify(
    {
      schemaVersion: 1,
      key: cacheKey,
      createdAt: new Date().toISOString(),
      generatorHash,
      voice,
      durationSeconds: verified.duration,
      correctionDb: Number(correctionDb.toFixed(3)),
    },
    null,
    2,
  ),
);
renameSync(cacheAudioPendingPath, cacheAudioPath);
if (wordTimingsPath) {
  renameSync(`${cacheWordTimingsPath}.pending`, cacheWordTimingsPath);
}
renameSync(cacheMetadataPendingPath, cacheMetadataPath);
writeAudioReport({
  ...verified,
  correctionDb,
  cacheHit: false,
  wordTimingStats,
});

console.log(`✓ voice ${ref}`);
console.log(`  ${request.audio}`);
console.log(
  `  ${verified.duration.toFixed(2)}s · ${verified.loudness.input_i} LUFS · ${verified.loudness.input_tp} dBTP`,
);
