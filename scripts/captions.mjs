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

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync('out', {recursive: true});

const serveUrl = await bundle({entryPoint: join(process.cwd(), 'src/index.ts')});
const comps = await getCompositions(serveUrl, {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: process.env.REMOTION_CHROME_MODE || undefined,
});

const seen = new Set();
for (const c of comps) {
  const slug = c.id.split('--')[0];
  if (seen.has(slug)) continue;
  if (slugs.length && !slugs.includes(slug)) continue;
  const spec = c.props?.spec;
  if (!spec) continue;
  seen.add(slug);
  const fps = spec.fps ?? 30;
  writeFileSync(join('out', `${slug}.srt`), toSrt(spec, fps));
  writeFileSync(join('out', `${slug}.vo.md`), toVoScript(spec, fps));
  console.log(`· ${slug}.srt + ${slug}.vo.md`);
}
