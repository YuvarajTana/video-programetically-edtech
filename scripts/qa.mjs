#!/usr/bin/env node
/**
 * Render arbitrary frames as stills, for visual QA without a full render.
 *
 *   node scripts/qa.mjs style-guide--reel 40 120 200 320
 *   node scripts/qa.mjs cdn-to-container--youtube 300
 *
 * Output lands in out/qa/. Fastest way to check a design change across every
 * scene type is to run it against style-guide--reel.
 */
import {bundle} from '@remotion/bundler';
import {getCompositions, renderStill} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const [compId, ...frames] = process.argv.slice(2);
mkdirSync('out/qa', {recursive: true});
const serveUrl = await bundle({entryPoint: join(process.cwd(), 'src/index.ts')});
const opts = {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: process.env.REMOTION_CHROME_MODE || undefined,
};
const comps = await getCompositions(serveUrl, opts);
const comp = comps.find((c) => c.id === compId);
for (const f of frames) {
  const out = `out/qa/${compId}-${f}.png`;
  await renderStill({composition: comp, serveUrl, output: out, frame: Number(f), overwrite: true, ...opts});
  console.log(out);
}
