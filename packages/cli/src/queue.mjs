#!/usr/bin/env node
/**
 * Run a resumable, sequential JSON production queue.
 *
 *   npm run queue -- queues/example.json --dry-run
 *   npm run queue -- queues/example.json
 *   npm run queue -- queues/example.json --restart
 */
import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {positionals} from './deliveries.mjs';
import {paths} from '@video-kit/core/config';

const argv = process.argv.slice(2);
const files = positionals(argv);
const has = (flag) => argv.includes(`--${flag}`);
const allowedFlags = new Set([
  '--help',
  '--dry-run',
  '--restart',
  '--continue-on-error',
]);
for (const arg of argv.filter((item) => item.startsWith('--'))) {
  if (!allowedFlags.has(arg)) {
    console.error(`unknown option: ${arg}`);
    process.exit(1);
  }
}

if (has('help') || files.length !== 1) {
  console.log(
    'usage: npm run queue -- <queue.json> [--dry-run] [--restart] [--continue-on-error]',
  );
  process.exit(has('help') ? 0 : 1);
}

const queuePath = resolve(files[0]);
if (!existsSync(queuePath)) {
  console.error(`queue file not found: ${queuePath}`);
  process.exit(1);
}

let queue;
try {
  queue = JSON.parse(readFileSync(queuePath, 'utf8'));
} catch (error) {
  console.error(`invalid queue JSON: ${error.message}`);
  process.exit(1);
}

const errors = [];
if (queue.schemaVersion !== 1) {
  errors.push('schemaVersion must be 1');
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(queue.id ?? '')) {
  errors.push('id must be lowercase kebab-case');
}
if (!Array.isArray(queue.jobs) || queue.jobs.length === 0) {
  errors.push('jobs must be a non-empty array');
}

const seenIds = new Set();
const seenRefs = new Set();
const voiceFields = new Set([
  'preset',
  'speed',
  'model',
  'language',
  'python',
]);
for (const [index, job] of (queue.jobs ?? []).entries()) {
  const path = `jobs[${index}]`;
  if (!job || typeof job !== 'object' || Array.isArray(job)) {
    errors.push(`${path} must be an object`);
    continue;
  }
  const id = job.id ?? job.ref?.replace('/', '--');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? '')) {
    errors.push(`${path}.id must be lowercase kebab-case`);
  } else if (seenIds.has(id)) {
    errors.push(`${path}.id duplicates "${id}"`);
  }
  seenIds.add(id);

  if (!/^(tech|learn|fun)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.ref ?? '')) {
    errors.push(`${path}.ref must look like tech/my-video`);
  } else if (seenRefs.has(job.ref)) {
    errors.push(`${path}.ref duplicates "${job.ref}"`);
  }
  seenRefs.add(job.ref);

  if (job.skipVoice && job.silent) {
    errors.push(`${path} cannot set both skipVoice and silent`);
  }
  for (const field of ['skipVoice', 'silent', 'force']) {
    if (job[field] !== undefined && typeof job[field] !== 'boolean') {
      errors.push(`${path}.${field} must be boolean`);
    }
  }
  if (
    job.voice !== undefined &&
    (!job.voice || typeof job.voice !== 'object' || Array.isArray(job.voice))
  ) {
    errors.push(`${path}.voice must be an object`);
  }
  for (const [field, selected] of Object.entries(job.voice ?? {})) {
    if (!voiceFields.has(field)) {
      errors.push(`${path}.voice.${field} is not supported`);
    } else if (field === 'speed') {
      if (!Number.isFinite(selected) || selected <= 0) {
        errors.push(`${path}.voice.speed must be a positive number`);
      }
    } else if (typeof selected !== 'string' || !selected.trim()) {
      errors.push(`${path}.voice.${field} must be a non-empty string`);
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`error ${error}`);
  process.exit(1);
}

const jobs = queue.jobs.map((job) => ({
  ...job,
  id: job.id ?? job.ref.replace('/', '--'),
}));
console.log(`✓ queue ${queue.id}: ${jobs.length} jobs`);
for (const job of jobs) {
  const mode = job.silent
    ? 'silent'
    : job.skipVoice
      ? 'reuse voice'
      : job.force
        ? 'force voice'
        : 'voice';
  console.log(`  ${job.id}: ${job.ref} (${mode})`);
}
if (has('dry-run')) {
  console.log('dry run complete; no jobs started');
  process.exit(0);
}

const stateDirectory = join(paths.out(), 'queues', queue.id);
const statePath = join(stateDirectory, 'state.json');
const pendingStatePath = join(stateDirectory, 'state.pending.json');
mkdirSync(stateDirectory, {recursive: true});

const previousState = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : null;
const state = {
  schemaVersion: 1,
  queueId: queue.id,
  source: basename(queuePath),
  sourceChecksum: createHash('sha256')
    .update(JSON.stringify(queue))
    .digest('hex'),
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  jobs: Object.fromEntries(
    jobs
      .filter((job) => previousState?.jobs?.[job.id])
      .map((job) => [job.id, previousState.jobs[job.id]]),
  ),
};

const persist = () => {
  state.updatedAt = new Date().toISOString();
  writeFileSync(pendingStatePath, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(pendingStatePath, statePath);
};

let completed = 0;
let skipped = 0;
let failed = 0;

for (const job of jobs) {
  const signature = createHash('sha256')
    .update(JSON.stringify(job))
    .digest('hex');
  const previous = state.jobs[job.id];
  if (
    !has('restart') &&
    previous?.status === 'completed' &&
    previous.signature === signature
  ) {
    console.log(`\n↷ ${job.id} already completed`);
    skipped++;
    continue;
  }

  const attempts = (previous?.attempts ?? 0) + 1;
  state.jobs[job.id] = {
    ref: job.ref,
    signature,
    status: 'running',
    attempts,
    startedAt: new Date().toISOString(),
    completedAt: null,
    exitCode: null,
  };
  persist();

  const produceArgs = ['scripts/produce.mjs', job.ref];
  if (job.skipVoice) produceArgs.push('--skip-voice');
  if (job.silent) produceArgs.push('--silent');
  if (job.force) produceArgs.push('--force');
  const voiceFlag = {
    preset: 'voice',
    speed: 'speed',
    model: 'model',
    language: 'language',
    python: 'python',
  };
  for (const [field, selected] of Object.entries(job.voice ?? {})) {
    produceArgs.push(`--${voiceFlag[field]}`, String(selected));
  }

  console.log(`\n▶ ${job.id} (${job.ref})`);
  const result = spawnSync(process.execPath, produceArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  const exitCode = result.status ?? 1;
  const status = !result.error && exitCode === 0 ? 'completed' : 'failed';
  state.jobs[job.id] = {
    ...state.jobs[job.id],
    status,
    completedAt: new Date().toISOString(),
    exitCode,
    error: result.error?.message ?? null,
  };
  persist();

  if (status === 'completed') {
    completed++;
    continue;
  }

  failed++;
  console.error(`× ${job.id} failed with exit code ${exitCode}`);
  if (!has('continue-on-error')) break;
}

state.completedAt = new Date().toISOString();
state.summary = {completed, skipped, failed};
persist();

console.log(
  `\nqueue complete: ${completed} completed · ${skipped} skipped · ${failed} failed`,
);
console.log(`state: ${statePath}`);
if (failed) process.exit(1);
