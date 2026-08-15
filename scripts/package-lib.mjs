import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';
import {chaptersFor, toChapterText} from './chapters-lib.mjs';
import {DELIVERIES} from './deliveries.mjs';
import {assertMediaFile} from './media-qa.mjs';
import {buildMasterTimeline} from '../shared/master-timeline.mjs';

const checksum = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const mediaCreditsFor = (spec) => {
  const assets = [];
  if (spec.soundtrack?.music) {
    assets.push({role: 'music', ...spec.soundtrack.music});
  }
  for (const effect of spec.soundtrack?.effects ?? []) {
    assets.push({role: 'sound-effect', ...effect});
  }
  return assets.map(
    ({
      role,
      src,
      credit,
      license,
      sourceUrl,
      startFrame,
      durationInFrames,
    }) => ({
      role,
      src,
      credit,
      license,
      sourceUrl: sourceUrl ?? null,
      startFrame: startFrame ?? 0,
      durationInFrames: durationInFrames ?? null,
    }),
  );
};

const descriptionFor = (spec, channel, platform, chapters) => {
  const lines = [spec.summary ?? ''];
  const sources = spec.editorial?.sources ?? [];
  if (sources.length) {
    lines.push('', 'Sources:');
    for (const source of sources) {
      lines.push(`- ${source.title}${source.url ? `: ${source.url}` : ''}`);
    }
  }
  const mediaCredits = mediaCreditsFor(spec);
  if (mediaCredits.length) {
    lines.push('', 'Audio credits:');
    for (const asset of mediaCredits) {
      lines.push(
        `- ${asset.role}: ${asset.credit} (${asset.license})${
          asset.sourceUrl ? `: ${asset.sourceUrl}` : ''
        }`,
      );
    }
  }
  if (platform === 'youtube' && chapters.length) {
    lines.push('', 'Chapters:', toChapterText(chapters).trim());
  }
  lines.push('', channel.handle);
  return lines.filter((line, index) => line || index > 0).join('\n').trim();
};

export const packageSpec = ({spec, channel, outRoot = 'out'}) => {
  const base = join(outRoot, spec.channel, spec.slug);
  const deliveries = spec.deliveries ?? channel.defaultDeliveries;
  const files = [];
  const mediaCredits = mediaCreditsFor(spec);
  const chapters = chaptersFor(spec);
  const publicRoot = resolve('public');
  const requestedWordTimingsSource = spec.captionTimings
    ? resolve(publicRoot, spec.captionTimings)
    : null;
  const wordTimingsSource =
    requestedWordTimingsSource?.startsWith(`${publicRoot}${sep}`)
      ? requestedWordTimingsSource
      : null;
  const wordTimings = wordTimingsSource && existsSync(wordTimingsSource)
    ? JSON.parse(readFileSync(wordTimingsSource, 'utf8'))
    : null;
  const mastered = buildMasterTimeline({
    spec,
    timings: wordTimings,
    locale: spec.editorial?.language ?? 'en-US',
    audioMode: spec.audio
      ? 'voiceover'
      : spec.soundtrack?.music
        ? 'music-only'
        : 'silent',
  });
  const masterTimelinePath = join(base, 'master-timeline.json');

  mkdirSync(base, {recursive: true});
  writeFileSync(join(base, 'chapters.txt'), toChapterText(chapters));
  writeFileSync(
    masterTimelinePath,
    JSON.stringify(mastered.timeline, null, 2) + '\n',
  );

  for (const deliveryId of deliveries) {
    const delivery = DELIVERIES[deliveryId];
    const deliveryDir = join(base, deliveryId);
    mkdirSync(deliveryDir, {recursive: true});

    const renderPath = join(base, 'renders', `${delivery.renderProfile}.mp4`);
    const videoPath = join(deliveryDir, 'video.mp4');
    const coverPath = join(deliveryDir, 'cover.png');
    const captionsPath = join(base, 'captions.srt');
    const packagedCaptionsPath = join(deliveryDir, 'captions.srt');
    const packagedWordTimingsPath = join(
      deliveryDir,
      'captions.words.json',
    );
    const packagedMasterTimelinePath = join(deliveryDir, 'master-timeline.json');
    const packagedChaptersPath = join(deliveryDir, 'chapters.txt');
    const expectedDurationSeconds =
      spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0) /
      (spec.fps ?? 30);
    const requireAudio = Boolean(
      spec.audio || spec.soundtrack?.music || spec.soundtrack?.effects?.length,
    );
    const mediaQa = existsSync(renderPath)
      ? assertMediaFile(renderPath, {expectedDurationSeconds, requireAudio})
      : null;

    if (existsSync(renderPath)) copyFileSync(renderPath, videoPath);
    if (existsSync(captionsPath)) copyFileSync(captionsPath, packagedCaptionsPath);
    if (wordTimingsSource && existsSync(wordTimingsSource)) {
      copyFileSync(wordTimingsSource, packagedWordTimingsPath);
    }
    copyFileSync(masterTimelinePath, packagedMasterTimelinePath);
    if (delivery.platform === 'youtube' && chapters.length) {
      copyFileSync(join(base, 'chapters.txt'), packagedChaptersPath);
    } else if (existsSync(packagedChaptersPath)) {
      unlinkSync(packagedChaptersPath);
    }

    const hashtags = channel.defaultHashtags[delivery.platform];
    const metadata = {
      schemaVersion: 1,
      channel: spec.channel,
      delivery: deliveryId,
      platform: delivery.platform,
      title: spec.title,
      description: descriptionFor(
        spec,
        channel,
        delivery.platform,
        chapters,
      ),
      hashtags,
      handle: channel.handle,
      mediaCredits,
      chapters: delivery.platform === 'youtube' ? chapters : [],
    };
    writeFileSync(
      join(deliveryDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2) + '\n',
    );

    files.push({
      delivery: deliveryId,
      platform: delivery.platform,
      renderProfile: delivery.renderProfile,
      status:
        existsSync(videoPath) && existsSync(coverPath)
          ? 'ready'
          : existsSync(coverPath)
            ? 'cover-only'
            : 'incomplete',
      video: existsSync(videoPath) ? relative(base, videoPath) : null,
      cover: existsSync(coverPath) ? relative(base, coverPath) : null,
      captions: existsSync(packagedCaptionsPath)
        ? relative(base, packagedCaptionsPath)
        : null,
      wordTimings: existsSync(packagedWordTimingsPath)
        ? relative(base, packagedWordTimingsPath)
        : null,
      masterTimeline: relative(base, packagedMasterTimelinePath),
      chapters:
        delivery.platform === 'youtube' &&
        existsSync(packagedChaptersPath)
          ? relative(base, packagedChaptersPath)
          : null,
      metadata: relative(base, join(deliveryDir, 'metadata.json')),
      qa: mediaQa,
    });
  }

  const manifest = {
    schemaVersion: 1,
    ref: `${spec.channel}/${spec.slug}`,
    channel: spec.channel,
    title: spec.title,
    template: spec.template,
    sourceChecksum: checksum(spec),
    sources: spec.editorial?.sources ?? [],
    media: mediaCredits,
    masterTimeline: relative(base, masterTimelinePath),
    files,
  };
  writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(base, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
  return manifest;
};
