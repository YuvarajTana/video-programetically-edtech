#!/usr/bin/env node
import {bundle} from '@remotion/bundler';
import {getCompositions} from '@remotion/renderer';
import {join} from 'node:path';
import {matchesRef, positionals, videoComposition} from './deliveries.mjs';
import {validateCollection} from './validation-lib.mjs';

const argv = process.argv.slice(2);
const refs = positionals(argv);
const includeStyleGuides = argv.includes('--studio');

const serveUrl = await bundle({
  entryPoint: join(process.cwd(), 'src/index.ts'),
  onProgress: () => {},
});
const compositions = await getCompositions(serveUrl, {
  browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: process.env.REMOTION_CHROME_MODE || undefined,
});

const entries = [];
const seen = new Set();
for (const composition of compositions.filter(videoComposition)) {
  const {spec, channel} = composition.props ?? {};
  if (!spec || !channel) continue;
  if (!includeStyleGuides && spec.kind === 'style-guide') continue;
  if (!matchesRef(spec, refs)) continue;
  const key = `${spec.kind ?? 'video'}:${spec.channel}/${spec.slug}`;
  if (seen.has(key)) continue;
  seen.add(key);
  entries.push({spec, channel});
}

if (!entries.length) {
  console.error('no video specs matched');
  process.exit(1);
}

const results = validateCollection(entries);
let errors = 0;
let warnings = 0;
for (const result of results) {
  const icon = result.issues.some((item) => item.severity === 'error') ? '×' : '✓';
  console.log(`${icon} ${result.ref}${result.kind === 'style-guide' ? ' [style guide]' : ''}`);
  for (const item of result.issues) {
    if (item.severity === 'error') errors++;
    else warnings++;
    console.log(`  ${item.severity === 'error' ? 'error' : 'warn '} ${item.path}: ${item.message}`);
  }
}

console.log(`\n${entries.length} specs · ${errors} errors · ${warnings} warnings`);
if (errors) process.exit(1);
