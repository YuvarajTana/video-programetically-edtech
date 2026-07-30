#!/usr/bin/env node
/**
 * Batch renderer.
 *
 *   npm run render                        every video, every format it declares
 *   npm run render -- cdn-to-container    one video, every format
 *   npm run render -- selection-sort --format reel
 *   npm run render -- --still             covers only, no video
 *
 * The bundle is built once and reused across every composition, which is most of
 * the speed win when you are producing a 16:9 and a 9:16 cut of the same video.
 */
import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia, renderStill} from '@remotion/renderer';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {FORMATS} from './formats.mjs';
import {toSrt, toVoScript} from './captions-lib.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : (argv[i + 1] ?? true);
};
const has = (name) => argv.includes(`--${name}`);
const slugs = argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--format');

const OUT = 'out';
const onlyFormat = flag('format');
const stillsOnly = has('still');
const coverFrame = Number(flag('cover') ?? 40);

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const concurrency = process.env.RENDER_CONCURRENCY
  ? Number(process.env.RENDER_CONCURRENCY)
  : null;
const chromeMode = process.env.REMOTION_CHROME_MODE || undefined;

mkdirSync(OUT, {recursive: true});

console.log('· bundling');
const serveUrl = await bundle({
  entryPoint: join(process.cwd(), 'src/index.ts'),
  onProgress: () => {},
});

const compositions = await getCompositions(serveUrl, {browserExecutable, chromeMode});

const wanted = compositions.filter((c) => {
  const [slug, formatId] = c.id.split('--');
  if (slugs.length && !slugs.includes(slug)) return false;
  if (onlyFormat && formatId !== onlyFormat) return false;
  return true;
});

if (!wanted.length) {
  console.error('no compositions matched. available:');
  compositions.forEach((c) => console.error('   ' + c.id));
  process.exit(1);
}

const writtenCaptions = new Set();

for (const comp of wanted) {
  const [slug, formatId] = comp.id.split('--');
  const target = FORMATS[formatId]?.target ?? formatId;
  const label = `${slug}.${target}`;

  // Cover frame, used as the YouTube thumbnail base and the Reel cover.
  const coverPath = join(OUT, `${label}.cover.png`);
  await renderStill({
    composition: comp,
    serveUrl,
    output: coverPath,
    frame: Math.min(coverFrame, comp.durationInFrames - 1),
    browserExecutable,
    chromeMode,
    overwrite: true,
  });
  console.log(`· cover  ${coverPath}`);

  if (!stillsOnly) {
    const videoPath = join(OUT, `${label}.mp4`);
    let last = -1;
    await renderMedia({
      composition: comp,
      serveUrl,
      codec: 'h264',
      crf: 18,
      outputLocation: videoPath,
      browserExecutable,
      chromeMode,
      concurrency,
      onProgress: ({progress}) => {
        const pct = Math.floor(progress * 100);
        if (pct >= last + 10) {
          last = pct;
          process.stdout.write(`\r· render ${label} ${pct}%   `);
        }
      },
    });
    process.stdout.write(`\r· render ${label} 100%\n`);
    console.log(`· video  ${videoPath}`);
  }

  // Captions and the VO script are per-video, not per-format.
  const spec = comp.props?.spec;
  if (spec && !writtenCaptions.has(slug)) {
    writtenCaptions.add(slug);
    const fps = spec.fps ?? 30;
    writeFileSync(join(OUT, `${slug}.srt`), toSrt(spec, fps));
    writeFileSync(join(OUT, `${slug}.vo.md`), toVoScript(spec, fps));
    console.log(`· subs   ${join(OUT, `${slug}.srt`)}`);
  }
}

console.log('\ndone →', OUT);
