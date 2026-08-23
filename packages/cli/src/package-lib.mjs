import {createHash} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';
import {chaptersFor, toChapterText} from './chapters-lib.mjs';
import {variantOutputName, variantsFor} from '@video-kit/core/output';
import {assertMediaFile} from './media-qa.mjs';
import {buildMasterTimeline} from '@video-kit/core/master-timeline';
import {paths} from '@video-kit/core/config';

const checksum = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const mediaCreditsFor = (spec) => {
  const assets = [];
  if (spec.soundtrack?.music) {
    assets.push({role: 'music', ...spec.soundtrack.music});
  }
  for (const effect of spec.soundtrack?.effects ?? []) {
    assets.push({role: 'sound-effect', ...effect});
  }
  for (const scene of spec.scenes ?? []) {
    if (scene.type === 'image' && scene.image) {
      assets.push({role: 'image', ...scene.image});
    }
    if (scene.type === 'videoClip' && scene.clip) {
      assets.push({role: 'video-clip', ...scene.clip});
    }
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
    lines.push('', 'Media credits:');
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

export const packageSpec = ({spec, channel, outRoot = paths.out()}) => {
  const base = join(outRoot, spec.channel, spec.slug);
  const files = [];
  const mediaCredits = mediaCreditsFor(spec);
  const chapters = chaptersFor(spec);
  const publicRoot = paths.public();
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
  const variants = variantsFor(spec, channel);
  const chaptersPath = join(base, 'chapters.txt');
  const captionsPath = join(base, 'captions.srt');
  const expectedDurationSeconds =
    spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0) /
    (spec.fps ?? 30);
  const requireAudio = Boolean(
    spec.audio || spec.soundtrack?.music || spec.soundtrack?.effects?.length,
  );

  /** One metadata sidecar per variant, named after it. */
  const writeVariantMetadata = (variant, platform, hashtags, wantsChapters) => {
    const name = `${variant.artifact.filenameStem}.metadata.json`;
    writeFileSync(
      join(base, name),
      JSON.stringify(
        {
          schemaVersion: 2,
          channel: spec.channel,
          variant: variant.id,
          delivery: variant.legacyDeliveryId ?? null,
          kind: variant.kind,
          platform,
          aspect: variant.aspect,
          title: spec.title,
          description: descriptionFor(spec, channel, platform, wantsChapters ? chapters : []),
          hashtags,
          handle: channel.handle,
          mediaCredits,
          chapters: wantsChapters ? chapters : [],
        },
        null,
        2,
      ) + '\n',
    );
    return name;
  };

  writeFileSync(join(base, 'chapters.txt'), toChapterText(chapters));
  writeFileSync(
    masterTimelinePath,
    JSON.stringify(mastered.timeline, null, 2) + '\n',
  );

  for (const variant of variants) {
    const naming = variantOutputName(variant);
    const platform = variant.platform ?? 'youtube';
    const hashtags = channel.defaultHashtags[platform] ?? [];
    const wantsChapters = platform === 'youtube' && chapters.length > 0;

    // Slides live in their own directory; every other kind is a single file.
    const slidesDir = naming.directory ? join(base, naming.directory) : null;
    const slides = slidesDir && existsSync(slidesDir)
      ? readdirSync(slidesDir)
          .filter((name) => name.endsWith(`.${naming.extension}`))
          .sort()
      : [];
    const filePath = naming.file ? join(base, naming.file) : null;
    const present = slidesDir ? slides.length > 0 : Boolean(filePath && existsSync(filePath));

    const entry = {
      variant: variant.id,
      delivery: variant.legacyDeliveryId ?? null,
      kind: variant.kind,
      platform: variant.platform ?? null,
      aspect: variant.aspect,
      status: present ? 'ready' : 'missing',
      path: slidesDir
        ? relative(base, slidesDir)
        : filePath && existsSync(filePath)
          ? relative(base, filePath)
          : null,
      slides: slides.map((name) => relative(base, join(slidesDir, name))),
    };

    if (variant.kind === 'video' && filePath && existsSync(filePath)) {
      entry.qa = assertMediaFile(filePath, {expectedDurationSeconds, requireAudio});
      entry.captions = existsSync(captionsPath) ? relative(base, captionsPath) : null;
      entry.masterTimeline = relative(base, masterTimelinePath);
      entry.chapters = wantsChapters ? relative(base, chaptersPath) : null;
      entry.metadata = writeVariantMetadata(variant, platform, hashtags, wantsChapters);
    } else if (variant.kind !== 'video') {
      entry.metadata = writeVariantMetadata(variant, platform, hashtags, false);
    }

    files.push(entry);
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
