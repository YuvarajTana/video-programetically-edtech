#!/usr/bin/env node
/**
 * Emit .srt subtitles and a voiceover script without rendering any video.
 *
 *   npm run captions
 *   npm run captions -- cdn-to-container
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {toSrt, toVoScript} from './captions-lib.mjs';
import {chaptersFor, toChapterText} from './chapters-lib.mjs';
import {
  matchesRef,
  positionals,
  preferredRenderProfile,
} from './deliveries.mjs';
import {loadSpecs} from './spec-loader.mjs';

const refs = positionals(process.argv.slice(2));

let count = 0;
for (const {spec, channel} of await loadSpecs()) {
  if (!matchesRef(spec, refs)) continue;
  const ref = `${spec.channel}/${spec.slug}`;
  const base = join('out', spec.channel, spec.slug);
  mkdirSync(base, {recursive: true});
  const fps = spec.fps ?? 30;
  writeFileSync(
    join(base, 'spec.json'),
    `${JSON.stringify(spec, null, 2)}\n`,
  );
  writeFileSync(join(base, 'captions.srt'), toSrt(spec, fps));
  writeFileSync(
    join(base, 'chapters.txt'),
    toChapterText(chaptersFor(spec, fps)),
  );
  writeFileSync(
    join(base, 'voiceover.md'),
    toVoScript(
      spec,
      fps,
      join(base, 'renders', `${preferredRenderProfile(spec, channel)}.mp4`),
      {
        min: channel.editorial.minNarrationWpm,
        max: channel.editorial.maxNarrationWpm,
      },
    ),
  );
  writeFileSync(
    join(base, 'voice.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        ref,
        audio: spec.audio ?? `audio/${spec.channel}/${spec.slug}/master.wav`,
        audioConfigured: Boolean(spec.audio),
        wordTimings:
          spec.captionTimings ??
          `audio/${spec.channel}/${spec.slug}/words.json`,
        wordTimingsConfigured: Boolean(spec.captionTimings),
        durationSeconds:
          spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0) /
          fps,
        voice: {...channel.voice, ...(spec.voice ?? {})},
      },
      null,
      2,
    ),
  );
  console.log(
    `· ${ref} captions.srt + chapters.txt + voiceover.md + voice.json`,
  );
  count++;
}

if (!count) {
  console.error('no production video specs matched');
  process.exit(1);
}
