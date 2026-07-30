#!/usr/bin/env node
import {bundle} from '@remotion/bundler';
import {getCompositions} from '@remotion/renderer';
import {join} from 'node:path';
import {matchesRef, positionals, videoComposition} from './deliveries.mjs';
import {packageSpec} from './package-lib.mjs';

const refs = positionals(process.argv.slice(2));
const serveUrl = await bundle({
  entryPoint: join(process.cwd(), 'src/index.ts'),
  onProgress: () => {},
});
const compositions = await getCompositions(serveUrl, {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: process.env.REMOTION_CHROME_MODE || undefined,
});

const seen = new Set();
let count = 0;
for (const composition of compositions.filter(videoComposition)) {
  const {spec, channel} = composition.props ?? {};
  if (!spec || !channel || spec.kind === 'style-guide') continue;
  if (!matchesRef(spec, refs)) continue;
  const ref = `${spec.channel}/${spec.slug}`;
  if (seen.has(ref)) continue;
  seen.add(ref);
  const manifest = packageSpec({spec, channel});
  console.log(`· package ${ref} (${manifest.files.map((file) => file.status).join(', ')})`);
  count++;
}

if (!count) {
  console.error('no production video specs matched');
  process.exit(1);
}
