#!/usr/bin/env node
/**
 * Render one prepared video on Remotion Lambda.
 *
 * Dry run (default):
 *   npm run cloud:render -- tech/my-video
 *
 * External AWS mutation:
 *   npm run cloud:render -- tech/my-video --execute
 */
import {
  deploySite,
  downloadMedia,
  getOrCreateBucket,
} from '@remotion/lambda';
import {
  getRenderProgress,
  renderMediaOnLambda,
  renderStillOnLambda,
} from '@remotion/lambda/client';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DELIVERIES, positionals} from './deliveries.mjs';
import {WORKSPACE_ROOT} from '@video-kit/core/config';
import {PUBLIC_DIR, RENDER_KIT_ENTRY} from './render-kit.mjs';

const argv = process.argv.slice(2);
const valueFlags = [
  'region',
  'function-name',
  'bucket-name',
  'site-name',
  'serve-url',
  'concurrency',
];
const allowedBooleanFlags = new Set(['--help', '--execute']);
for (const arg of argv.filter((item) => item.startsWith('--'))) {
  if (
    !allowedBooleanFlags.has(arg) &&
    !valueFlags.includes(arg.slice(2))
  ) {
    console.error(`unknown option: ${arg}`);
    process.exit(1);
  }
}
for (const flag of valueFlags) {
  const index = argv.indexOf(`--${flag}`);
  if (index !== -1 && (!argv[index + 1] || argv[index + 1].startsWith('--'))) {
    console.error(`--${flag} requires a value`);
    process.exit(1);
  }
}
const refs = positionals(argv, valueFlags);
const has = (flag) => argv.includes(`--${flag}`);
const value = (flag) => {
  const index = argv.indexOf(`--${flag}`);
  return index === -1 ? null : argv[index + 1];
};

if (has('help') || refs.length !== 1) {
  console.log(
    'usage: npm run cloud:render -- <channel>/<slug> [--execute] [--region id] [--function-name name] [--bucket-name name] [--site-name name] [--serve-url url] [--concurrency number]',
  );
  process.exit(has('help') ? 0 : 1);
}

const ref = refs[0];
if (!/^(tech|learn|fun)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref)) {
  console.error('video ref must look like: tech/my-video');
  process.exit(1);
}
const [channel, slug] = ref.split('/');
const base = join('out', channel, slug);
const specPath = join(base, 'spec.json');
if (!existsSync(specPath)) {
  console.error(`missing ${specPath}; run npm run captions -- ${ref} first`);
  process.exit(1);
}

let spec = JSON.parse(readFileSync(specPath, 'utf8'));
const deliveries = spec.deliveries;
if (!Array.isArray(deliveries) || deliveries.length === 0) {
  console.error(`${ref} must declare at least one delivery for cloud rendering`);
  process.exit(1);
}
for (const delivery of deliveries) {
  if (!DELIVERIES[delivery]) {
    console.error(`unknown delivery: ${delivery}`);
    process.exit(1);
  }
}

const renderProfiles = [
  ...new Set(deliveries.map((delivery) => DELIVERIES[delivery].renderProfile)),
];
const videoJobs = renderProfiles.map((profile) => ({
  kind: 'video',
  composition: `${channel}--${slug}--${profile}`,
  output: join(base, 'renders', `${profile}.mp4`),
}));
const coverJobs = deliveries.map((delivery) => ({
  kind: 'cover',
  composition: `${channel}--${slug}--${delivery}--cover`,
  output: join(base, delivery, 'cover.png'),
}));

const config = {
  region: value('region') ?? process.env.REMOTION_LAMBDA_REGION ?? null,
  functionName:
    value('function-name') ??
    process.env.REMOTION_LAMBDA_FUNCTION_NAME ??
    null,
  bucketName:
    value('bucket-name') ??
    process.env.REMOTION_LAMBDA_BUCKET_NAME ??
    null,
  siteName:
    value('site-name') ??
    process.env.REMOTION_LAMBDA_SITE_NAME ??
    'video-kit',
  serveUrl:
    value('serve-url') ?? process.env.REMOTION_LAMBDA_SERVE_URL ?? null,
  concurrency: Number(
    value('concurrency') ?? process.env.REMOTION_LAMBDA_CONCURRENCY ?? 10,
  ),
};
if (
  !Number.isInteger(config.concurrency) ||
  config.concurrency < 1 ||
  config.concurrency > 200
) {
  console.error('--concurrency must be an integer from 1 to 200');
  process.exit(1);
}

const plan = {
  schemaVersion: 1,
  ref,
  provider: 'remotion-lambda',
  privacy: 'private',
  config,
  jobs: [...videoJobs, ...coverJobs],
};
console.log(JSON.stringify(plan, null, 2));
if (!has('execute')) {
  console.log('\ndry run only; no AWS request was made');
  console.log('review the plan, then add --execute to render remotely');
  process.exit(0);
}

for (const [key, selected] of Object.entries({
  REMOTION_LAMBDA_REGION: config.region,
  REMOTION_LAMBDA_FUNCTION_NAME: config.functionName,
})) {
  if (!selected) {
    console.error(`${key} is required`);
    process.exit(1);
  }
}

const runLocal = (name, script, args) => {
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error(`${name} failed`);
    process.exit(result.status ?? 1);
  }
};

runLocal('validate', 'scripts/validate.mjs', [ref]);
runLocal('captions', 'scripts/captions.mjs', [ref]);
spec = JSON.parse(readFileSync(specPath, 'utf8'));

const publicRoot = resolve('public');
for (const asset of [spec.audio, spec.captionTimings].filter(Boolean)) {
  const assetPath = resolve(publicRoot, asset);
  if (
    !assetPath.startsWith(`${publicRoot}${sep}`) ||
    !existsSync(assetPath)
  ) {
    console.error(`missing prepared asset public/${asset}`);
    process.exit(1);
  }
}

if (!config.bucketName) {
  console.log('\n▶ resolve bucket');
  const bucket = await getOrCreateBucket({
    region: config.region,
    enableFolderExpiry: true,
  });
  config.bucketName = bucket.bucketName;
  console.log(`  ${bucket.alreadyExisted ? 'using' : 'created'} ${bucket.bucketName}`);
}

let serveUrl = config.serveUrl;
let deployedSite = null;
if (!serveUrl) {
  console.log('\n▶ deploy site');
  deployedSite = await deploySite({
    bucketName: config.bucketName,
    region: config.region,
    siteName: config.siteName,
    entryPoint: RENDER_KIT_ENTRY,
    options: {
      publicDir: PUBLIC_DIR,
      rootDir: WORKSPACE_ROOT,
      enableCaching: true,
      onBundleProgress: (progress) =>
        process.stdout.write(`\r  bundle ${Math.floor(progress)}%   `),
      onUploadProgress: ({totalFiles, filesUploaded}) =>
        process.stdout.write(
          `\r  upload ${filesUploaded}/${totalFiles} files   `,
        ),
    },
  });
  process.stdout.write('\n');
  serveUrl = deployedSite.serveUrl;
}

const reportPath = join(base, 'cloud.json');
const reportPendingPath = join(base, 'cloud.pending.json');
const report = {
  schemaVersion: 1,
  ref,
  provider: 'remotion-lambda',
  region: config.region,
  functionName: config.functionName,
  bucketName: config.bucketName,
  siteName: deployedSite?.siteName ?? config.siteName,
  serveUrl,
  startedAt: new Date().toISOString(),
  completedAt: null,
  status: 'rendering',
  jobs: [],
};
const persist = () => {
  writeFileSync(reportPendingPath, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(reportPendingPath, reportPath);
};
persist();

const wait = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

const download = async ({bucketName, renderId, output}) => {
  mkdirSync(dirname(output), {recursive: true});
  await downloadMedia({
    region: config.region,
    bucketName,
    renderId,
    outPath: output,
    onProgress: ({percent}) =>
      process.stdout.write(`\r  download ${Math.floor(percent * 100)}%   `),
  });
  process.stdout.write('\n');
};

try {
  for (const job of videoJobs) {
    console.log(`\n▶ cloud video ${job.composition}`);
    const started = await renderMediaOnLambda({
      region: config.region,
      functionName: config.functionName,
      serveUrl,
      composition: job.composition,
      codec: 'h264',
      audioCodec: 'aac',
      sampleRate: 48000,
      crf: 18,
      concurrency: config.concurrency,
      privacy: 'private',
      overwrite: true,
      maxRetries: 2,
      timeoutInMilliseconds: 120000,
      forceBucketName: config.bucketName,
      outName: `${channel}-${slug}-${job.composition.split('--').at(-1)}.mp4`,
      ...(process.env.REMOTION_LICENSE_KEY
        ? {licenseKey: process.env.REMOTION_LICENSE_KEY}
        : {}),
    });

    let lastPercent = -1;
    let progress;
    while (true) {
      progress = await getRenderProgress({
        renderId: started.renderId,
        bucketName: started.bucketName,
        functionName: config.functionName,
        region: config.region,
      });
      if (progress.fatalErrorEncountered) {
        throw new Error(
          progress.errors.map((error) => error.message).join('; ') ||
            `cloud render ${started.renderId} failed`,
        );
      }
      const percent = Math.floor(progress.overallProgress * 100);
      if (percent >= lastPercent + 5) {
        lastPercent = percent;
        console.log(`  render ${percent}%`);
      }
      if (progress.done) break;
      await wait(2000);
    }

    await download({
      bucketName: started.bucketName,
      renderId: started.renderId,
      output: job.output,
    });
    report.jobs.push({
      ...job,
      status: 'completed',
      renderId: started.renderId,
      outputFile: progress.outputFile,
      outputSizeInBytes: progress.outputSizeInBytes,
      estimatedBillingDurationInMilliseconds:
        progress.estimatedBillingDurationInMilliseconds,
    });
    persist();
  }

  for (const job of coverJobs) {
    console.log(`\n▶ cloud cover ${job.composition}`);
    const result = await renderStillOnLambda({
      region: config.region,
      functionName: config.functionName,
      serveUrl,
      composition: job.composition,
      inputProps: {},
      imageFormat: 'png',
      frame: 0,
      privacy: 'private',
      forceBucketName: config.bucketName,
      outName: `${channel}-${slug}-${job.composition.split('--')[2]}-cover.png`,
      ...(process.env.REMOTION_LICENSE_KEY
        ? {licenseKey: process.env.REMOTION_LICENSE_KEY}
        : {}),
    });
    await download({
      bucketName: result.bucketName,
      renderId: result.renderId,
      output: job.output,
    });
    report.jobs.push({
      ...job,
      status: 'completed',
      renderId: result.renderId,
      outputSizeInBytes: result.sizeInBytes,
    });
    persist();
  }

  runLocal('package', 'scripts/package.mjs', [ref]);
  report.status = 'completed';
  report.completedAt = new Date().toISOString();
  persist();
  console.log(`\n✓ cloud render complete ${ref}`);
  console.log(`  report: ${reportPath}`);
} catch (error) {
  report.status = 'failed';
  report.completedAt = new Date().toISOString();
  report.error = error.message;
  persist();
  console.error(`\n× cloud render failed: ${error.message}`);
  process.exit(1);
}
