#!/usr/bin/env node
import {matchesRef, positionals} from './deliveries.mjs';
import {packageSpec} from './package-lib.mjs';
import {loadSpecs} from './spec-loader.mjs';

const refs = positionals(process.argv.slice(2));

let count = 0;
for (const {spec, channel} of await loadSpecs()) {
  if (!matchesRef(spec, refs)) continue;
  const ref = `${spec.channel}/${spec.slug}`;
  const manifest = packageSpec({spec, channel});
  console.log(`· package ${ref} (${manifest.files.map((file) => file.status).join(', ')})`);
  count++;
}

if (!count) {
  console.error('no production video specs matched');
  process.exit(1);
}
