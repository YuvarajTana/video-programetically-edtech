#!/usr/bin/env node
/**
 * Render arbitrary frames as stills, for visual QA without a full render.
 *
 *   npm run qa -- learn--style-guide--portrait 40 120 200 320
 *   npm run qa -- tech--cdn-to-container--landscape 300
 *
 * Output lands in out/qa/. Fastest way to check a design change across every
 * scene type is to run it against the matching channel style guide.
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
if (!comp) {
  console.error(`composition "${compId}" not found`);
  console.error('available video compositions:');
  comps
    .filter((item) => item.id.split('--').length === 3)
    .forEach((item) => console.error(`  ${item.id}`));
  process.exit(1);
}
for (const f of frames) {
  const out = `out/qa/${compId}-${f}.png`;
  await renderStill({composition: comp, serveUrl, output: out, frame: Number(f), overwrite: true, ...opts});
  console.log(out);
}
