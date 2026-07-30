#!/usr/bin/env node
/**
 * Emit .srt subtitles and a voiceover script without rendering any video.
 *
 *   npm run captions
 *   npm run captions -- cdn-to-container
 */
import {bundle} from '@remotion/bundler';
import {getCompositions} from '@remotion/renderer';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {toSrt, toVoScript} from './captions-lib.mjs';
import {
  matchesRef,
  positionals,
  preferredRenderProfile,
  videoComposition,
} from './deliveries.mjs';

const refs = positionals(process.argv.slice(2));

const serveUrl = await bundle({entryPoint: join(process.cwd(), 'src/index.ts')});
const comps = await getCompositions(serveUrl, {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: process.env.REMOTION_CHROME_MODE || undefined,
});

const seen = new Set();
let count = 0;
for (const c of comps.filter(videoComposition)) {
  const spec = c.props?.spec;
  const channel = c.props?.channel;
  if (!spec || !channel || spec.kind === 'style-guide' || !matchesRef(spec, refs)) continue;
  const ref = `${spec.channel}/${spec.slug}`;
  if (seen.has(ref)) continue;
  seen.add(ref);
  const base = join('out', spec.channel, spec.slug);
  mkdirSync(base, {recursive: true});
  const fps = spec.fps ?? 30;
  writeFileSync(join(base, 'captions.srt'), toSrt(spec, fps));
  writeFileSync(
    join(base, 'voiceover.md'),
    toVoScript(
      spec,
      fps,
      join(base, 'renders', `${preferredRenderProfile(spec, channel)}.mp4`),
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
  console.log(`· ${ref} captions.srt + voiceover.md + voice.json`);
  count++;
}

if (!count) {
  console.error('no production video specs matched');
  process.exit(1);
}
