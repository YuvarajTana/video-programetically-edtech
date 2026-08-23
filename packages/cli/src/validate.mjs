#!/usr/bin/env node
/**
 * Validate specs straight from the registries. No bundling, no browser —
 * fast enough to run before every render and inside CI.
 */
import {matchesRef, positionals} from './deliveries.mjs';
import {loadSpecs} from './spec-loader.mjs';
import {validateCollection} from './validation-lib.mjs';

const argv = process.argv.slice(2);
const refs = positionals(argv);
const includeStyleGuides = argv.includes('--studio');

const entries = (await loadSpecs({includeStyleGuides})).filter(({spec}) =>
  matchesRef(spec, refs),
);

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
