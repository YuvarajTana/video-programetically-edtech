#!/usr/bin/env node
/**
 * Review or explicitly publish one ready delivery package.
 *
 * Dry run (default):
 *   npm run publish -- tech/my-video --delivery youtube-long
 *
 * External mutation:
 *   npm run publish -- tech/my-video --delivery youtube-long --execute
 */
import {
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {positionals} from './deliveries.mjs';
import {publishInstagramReel} from './publishing/instagram.mjs';
import {publishYouTube} from './publishing/youtube.mjs';

const argv = process.argv.slice(2);
const valueFlags = [
  'delivery',
  'privacy',
  'category',
  'video-url',
  'cover-url',
  'graph-version',
  'share-to-feed',
];
const allowedBooleanFlags = new Set(['--help', '--execute', '--force']);
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

if (has('help') || refs.length !== 1 || !value('delivery')) {
  console.log(
    'usage: npm run publish -- <channel>/<slug> --delivery <id> [--execute] [--force] [--privacy private|unlisted|public] [--video-url https://...] [--cover-url https://...] [--graph-version vNN.N] [--share-to-feed true|false]',
  );
  process.exit(has('help') ? 0 : 1);
}

const ref = refs[0];
if (!/^(tech|learn|fun)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref)) {
  console.error('video ref must look like: tech/my-video');
  process.exit(1);
}

const [channel, slug] = ref.split('/');
const deliveryId = value('delivery');
const base = join('out', channel, slug);
const manifestPath = join(base, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`missing ${manifestPath}; run npm run produce -- ${ref} first`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const delivery = manifest.files.find((file) => file.delivery === deliveryId);
if (!delivery) {
  console.error(`delivery ${deliveryId} is not configured for ${ref}`);
  process.exit(1);
}
if (delivery.status !== 'ready' || !delivery.video || !delivery.metadata) {
  console.error(`delivery ${deliveryId} is not ready`);
  process.exit(1);
}

const videoPath = resolve(base, delivery.video);
const metadataPath = resolve(base, delivery.metadata);
const resolvedBase = resolve(base);
if (
  !videoPath.startsWith(`${resolvedBase}${sep}`) ||
  !metadataPath.startsWith(`${resolvedBase}${sep}`) ||
  !existsSync(videoPath) ||
  !existsSync(metadataPath)
) {
  console.error('packaged video or metadata is missing');
  process.exit(1);
}
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const privacy = value('privacy') ?? 'private';
if (!['private', 'unlisted', 'public'].includes(privacy)) {
  console.error('--privacy must be private, unlisted, or public');
  process.exit(1);
}
const shareToFeedValue = value('share-to-feed') ?? 'true';
if (!['true', 'false'].includes(shareToFeedValue)) {
  console.error('--share-to-feed must be true or false');
  process.exit(1);
}

const categoryByChannel = {tech: '28', learn: '27', fun: '24'};
const categoryId = value('category') ?? categoryByChannel[channel];
if (!/^\d+$/.test(categoryId)) {
  console.error('--category must be a numeric YouTube category ID');
  process.exit(1);
}
const plan = {
  schemaVersion: 1,
  ref,
  sourceChecksum: manifest.sourceChecksum,
  delivery: deliveryId,
  platform: delivery.platform,
  video: delivery.video,
  metadata: delivery.metadata,
  title: metadata.title,
  description: metadata.description,
  hashtags: metadata.hashtags,
  options:
    delivery.platform === 'youtube'
      ? {
          privacy,
          categoryId,
        }
      : {
          videoUrl: value('video-url'),
          coverUrl: value('cover-url'),
          graphVersion:
            value('graph-version') ?? process.env.META_GRAPH_VERSION ?? null,
          shareToFeed: shareToFeedValue === 'true',
        },
};

const ledgerPath = join(base, 'publishing.json');
const ledgerPendingPath = join(base, 'publishing.pending.json');
const ledger = existsSync(ledgerPath)
  ? JSON.parse(readFileSync(ledgerPath, 'utf8'))
  : {schemaVersion: 1, ref, attempts: []};
const alreadyPublished = ledger.attempts.find(
  (attempt) =>
    attempt.status === 'published' &&
    attempt.delivery === deliveryId &&
    attempt.sourceChecksum === manifest.sourceChecksum,
);

console.log(JSON.stringify(plan, null, 2));
if (alreadyPublished && !has('force')) {
  console.error(
    `this exact ${deliveryId} source was already published as ${alreadyPublished.id}; pass --force to publish it again`,
  );
  process.exit(1);
}
if (!has('execute')) {
  console.log('\ndry run only; no external request was made');
  console.log('review the plan, then add --execute to publish');
  process.exit(0);
}

const persist = () => {
  writeFileSync(ledgerPendingPath, `${JSON.stringify(ledger, null, 2)}\n`);
  renameSync(ledgerPendingPath, ledgerPath);
};
const attempt = {
  delivery: deliveryId,
  platform: delivery.platform,
  sourceChecksum: manifest.sourceChecksum,
  startedAt: new Date().toISOString(),
  completedAt: null,
  status: 'publishing',
  id: null,
  url: null,
  error: null,
};
ledger.attempts.push(attempt);
persist();

try {
  let result;
  if (delivery.platform === 'youtube') {
    const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
    if (!accessToken) throw new Error('YOUTUBE_ACCESS_TOKEN is required');
    result = await publishYouTube({
      accessToken,
      videoPath,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.hashtags,
      privacy,
      categoryId,
      onProgress: (progress) =>
        console.log(`YouTube upload ${Math.floor(progress * 100)}%`),
    });
  } else if (delivery.platform === 'instagram') {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
    const graphVersion =
      value('graph-version') ?? process.env.META_GRAPH_VERSION;
    const videoUrl = value('video-url');
    if (!accessToken) throw new Error('META_ACCESS_TOKEN is required');
    if (!accountId) throw new Error('INSTAGRAM_ACCOUNT_ID is required');
    if (!graphVersion) throw new Error('META_GRAPH_VERSION is required');
    if (!/^v\d+\.\d+$/.test(graphVersion)) {
      throw new Error('META_GRAPH_VERSION must look like v25.0');
    }
    if (!videoUrl || !videoUrl.startsWith('https://')) {
      throw new Error('--video-url must be a public HTTPS URL');
    }
    const coverUrl = value('cover-url');
    if (coverUrl && !coverUrl.startsWith('https://')) {
      throw new Error('--cover-url must be a public HTTPS URL');
    }
    const caption = [
      metadata.description,
      metadata.hashtags.map((tag) => `#${tag}`).join(' '),
    ]
      .filter(Boolean)
      .join('\n\n');
    result = await publishInstagramReel({
      accessToken,
      accountId,
      graphVersion,
      videoUrl,
      coverUrl,
      caption,
      shareToFeed: shareToFeedValue === 'true',
      onStatus: (status) => console.log(`Instagram container ${status}`),
    });
  } else {
    throw new Error(`unsupported platform: ${delivery.platform}`);
  }

  Object.assign(attempt, {
    completedAt: new Date().toISOString(),
    status: 'published',
    id: result.id,
    url: result.url ?? null,
  });
  persist();
  console.log(`\n✓ published ${deliveryId}: ${result.url ?? result.id}`);
} catch (error) {
  Object.assign(attempt, {
    completedAt: new Date().toISOString(),
    status: 'failed',
    error: error.message,
  });
  persist();
  console.error(`\n× publish failed: ${error.message}`);
  process.exit(1);
}
