#!/usr/bin/env node
/**
 * Run the complete local production pipeline for one video.
 *
 *   npm run produce -- tech/context-vs-harness-engineering
 *   npm run produce -- tech/context-vs-harness-engineering --skip-voice
 *   npm run produce -- fun/my-video --silent
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {positionals} from './deliveries.mjs';

const argv = process.argv.slice(2);
const valueFlags = ['voice', 'speed', 'model', 'language', 'python'];
for (const flag of valueFlags) {
  const index = argv.indexOf(`--${flag}`);
  if (index !== -1 && (!argv[index + 1] || argv[index + 1].startsWith('--'))) {
    console.error(`--${flag} requires a value`);
    process.exit(1);
  }
}
const refs = positionals(argv, valueFlags);
const has = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : argv[index + 1];
};

if (has('help') || refs.length !== 1) {
  console.log(
    'usage: npm run produce -- <channel>/<slug> [--skip-voice | --silent] [--voice preset] [--speed number] [--model id] [--language code] [--python path] [--force]',
  );
  process.exit(has('help') ? 0 : 1);
}

if (has('skip-voice') && has('silent')) {
  console.error('choose either --skip-voice or --silent, not both');
  process.exit(1);
}

const ref = refs[0];
if (!/^(tech|learn|fun)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref)) {
  console.error('video ref must look like: tech/context-vs-harness-engineering');
  process.exit(1);
}

const [channel, slug] = ref.split('/');
const base = join('out', channel, slug);
const reportPath = join(base, 'production.json');
const startedAt = new Date().toISOString();
const stages = [];
mkdirSync(base, {recursive: true});

const writeReport = (status, extra = {}) => {
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        ref,
        status,
        startedAt,
        completedAt: new Date().toISOString(),
        stages,
        ...extra,
      },
      null,
      2,
    )}\n`,
  );
};

const runStage = (name, command, args) => {
  const started = performance.now();
  console.log(`\n▶ ${name}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  const durationSeconds = Number(
    ((performance.now() - started) / 1000).toFixed(2),
  );
  const status = result.error || result.status !== 0 ? 'failed' : 'completed';
  stages.push({name, status, durationSeconds});

  if (result.error || result.status !== 0) {
    writeReport('failed', {
      failedStage: name,
      error: result.error?.message ?? `exit code ${result.status ?? 1}`,
    });
    console.error(`\n× production failed during ${name}`);
    console.error(`  report: ${reportPath}`);
    process.exit(result.status ?? 1);
  }
};

runStage('typecheck', 'npm', ['run', 'typecheck']);
runStage('validate', process.execPath, ['scripts/validate.mjs', ref]);

if (has('silent')) {
  stages.push({name: 'voice', status: 'skipped-silent', durationSeconds: 0});
} else if (has('skip-voice')) {
  runStage('captions', process.execPath, ['scripts/captions.mjs', ref]);
  stages.push({name: 'voice', status: 'reused', durationSeconds: 0});
} else {
  const voiceArgs = ['scripts/voice.mjs', ref];
  for (const flag of valueFlags) {
    const selected = value(flag);
    if (selected !== null) voiceArgs.push(`--${flag}`, selected);
  }
  if (has('force')) voiceArgs.push('--force');
  runStage('voice', process.execPath, voiceArgs);
}

let voiceRequest = null;
if (!has('silent')) {
  const requestPath = join(base, 'voice.json');
  if (!existsSync(requestPath)) {
    writeReport('failed', {
      failedStage: 'audio-preflight',
      error: `missing ${requestPath}`,
    });
    console.error(`missing ${requestPath}`);
    process.exit(1);
  }

  voiceRequest = JSON.parse(readFileSync(requestPath, 'utf8'));
  if (!voiceRequest.audioConfigured) {
    writeReport('failed', {
      failedStage: 'audio-preflight',
      error: 'spec.audio is not configured',
    });
    console.error(
      `video ${ref} does not declare spec.audio; add audio: '${voiceRequest.audio}' or intentionally pass --silent`,
    );
    process.exit(1);
  }

  const publicRoot = resolve('public');
  const audioPath = resolve(publicRoot, voiceRequest.audio);
  if (
    !audioPath.startsWith(`${publicRoot}${sep}`) ||
    !existsSync(audioPath)
  ) {
    writeReport('failed', {
      failedStage: 'audio-preflight',
      error: `missing public/${voiceRequest.audio}`,
    });
    console.error(`missing public/${voiceRequest.audio}`);
    process.exit(1);
  }
}

runStage('render', process.execPath, ['scripts/render.mjs', ref]);
runStage('package', process.execPath, ['scripts/package.mjs', ref]);

const manifestPath = join(base, 'manifest.json');
if (!existsSync(manifestPath)) {
  writeReport('failed', {
    failedStage: 'package-verification',
    error: `missing ${manifestPath}`,
  });
  console.error(`missing ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const incomplete = manifest.files.filter((file) => file.status !== 'ready');
if (incomplete.length) {
  writeReport('failed', {
    failedStage: 'package-verification',
    error: `incomplete deliveries: ${incomplete
      .map((file) => file.delivery)
      .join(', ')}`,
  });
  console.error(
    `incomplete deliveries: ${incomplete.map((file) => file.delivery).join(', ')}`,
  );
  process.exit(1);
}

writeReport('completed', {
  audio: voiceRequest?.audio ?? null,
  deliveries: manifest.files.map((file) => ({
    id: file.delivery,
    platform: file.platform,
    status: file.status,
  })),
});

console.log(`\n✓ production complete ${ref}`);
console.log(`  ${manifest.files.length} deliveries ready`);
console.log(`  report: ${reportPath}`);
