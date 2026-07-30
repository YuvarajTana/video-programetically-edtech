import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import {join, relative} from 'node:path';
import {DELIVERIES} from './deliveries.mjs';

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

const descriptionFor = (spec, channel) => {
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
  lines.push('', channel.handle);
  return lines.filter((line, index) => line || index > 0).join('\n').trim();
};

export const packageSpec = ({spec, channel, outRoot = 'out'}) => {
  const base = join(outRoot, spec.channel, spec.slug);
  const deliveries = spec.deliveries ?? channel.defaultDeliveries;
  const files = [];
  const mediaCredits = mediaCreditsFor(spec);

  mkdirSync(base, {recursive: true});

  for (const deliveryId of deliveries) {
    const delivery = DELIVERIES[deliveryId];
    const deliveryDir = join(base, deliveryId);
    mkdirSync(deliveryDir, {recursive: true});

    const renderPath = join(base, 'renders', `${delivery.renderProfile}.mp4`);
    const videoPath = join(deliveryDir, 'video.mp4');
    const coverPath = join(deliveryDir, 'cover.png');
    const captionsPath = join(base, 'captions.srt');
    const packagedCaptionsPath = join(deliveryDir, 'captions.srt');

    if (existsSync(renderPath)) copyFileSync(renderPath, videoPath);
    if (existsSync(captionsPath)) copyFileSync(captionsPath, packagedCaptionsPath);

    const hashtags = channel.defaultHashtags[delivery.platform];
    const metadata = {
      schemaVersion: 1,
      channel: spec.channel,
      delivery: deliveryId,
      platform: delivery.platform,
      title: spec.title,
      description: descriptionFor(spec, channel),
      hashtags,
      handle: channel.handle,
      mediaCredits,
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
      metadata: relative(base, join(deliveryDir, 'metadata.json')),
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
    files,
  };
  writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(base, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
  return manifest;
};
