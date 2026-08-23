#!/usr/bin/env node
/**
 * Assert the package boundaries the refactor established.
 *
 * The root tsconfig maps every @video-kit/* specifier, so TypeScript happily
 * resolves an import a package has not declared — which is exactly how the
 * old directory layout drifted into a cycle. This checks that each package
 * only imports what its own package.json depends on, and that nothing imports
 * across a boundary the architecture forbids.
 *
 *   npm run deps:check
 */
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fromRoot} from '@video-kit/core/config';

const PACKAGES_DIR = fromRoot('packages');

/** Imports that must never appear, whatever package.json says. */
const FORBIDDEN = [
  {
    from: 'core',
    pattern: /@video-kit\//,
    reason: 'core is the dependency leaf and must not import another package',
  },
];

const sourceFiles = (directory) => {
  const found = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|mjs)$/.test(entry) && !entry.endsWith('.d.mts')) found.push(path);
    }
  };
  walk(directory);
  return found;
};

const importsOf = (source) => [
  ...source.matchAll(/from '([^']+)'|import\('([^']+)'\)/g),
].map((match) => match[1] ?? match[2]);

const problems = [];

for (const name of readdirSync(PACKAGES_DIR)) {
  const root = join(PACKAGES_DIR, name);
  if (!statSync(root).isDirectory()) continue;

  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);

  for (const file of sourceFiles(join(root, 'src'))) {
    const source = readFileSync(file, 'utf8');
    const relative = file.slice(root.length + 1);

    for (const specifier of importsOf(source)) {
      if (!specifier.startsWith('@video-kit/')) continue;
      const [scope, pkg] = specifier.split('/');
      const packageName = `${scope}/${pkg}`;
      if (packageName === manifest.name) continue;
      if (!declared.has(packageName)) {
        problems.push(
          `${name}/${relative} imports ${packageName}, which is not in its package.json dependencies`,
        );
      }
    }

    for (const rule of FORBIDDEN) {
      if (rule.from !== name) continue;
      for (const specifier of importsOf(source)) {
        if (rule.pattern.test(specifier)) {
          problems.push(`${name}/${relative} imports ${specifier}: ${rule.reason}`);
        }
      }
    }
  }
}

/**
 * core's default entry must stay isomorphic: the studio bundles it, so anything
 * reachable from the barrel that touches node: breaks the browser build. Only
 * the closure from index.ts matters — the node-only subpaths (config, and the
 * modules that hash or read files) are reached deliberately by Node callers.
 */
const isomorphicClosure = (entry) => {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const specifier of importsOf(source)) {
      if (!specifier.startsWith('.')) continue;
      const base = join(dirname(file), specifier);
      const candidate = [
        `${base}.ts`,
        `${base}.tsx`,
        join(base, 'index.ts'),
        base,
      ].find((path) => existsSync(path) && statSync(path).isFile());
      if (candidate) queue.push(candidate);
    }
  }
  return seen;
};

const coreEntry = join(PACKAGES_DIR, 'core', 'src', 'index.ts');
for (const file of isomorphicClosure(coreEntry)) {
  for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
    if (!specifier.startsWith('node:')) continue;
    problems.push(
      `core/${file.slice(join(PACKAGES_DIR, 'core').length + 1)} imports ${specifier}, ` +
        'but it is reachable from the isomorphic entry point that the studio bundles',
    );
  }
}

if (problems.length) {
  console.error('package boundary violations:\n');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} violation(s)`);
  process.exit(1);
}

console.log('✓ package boundaries hold');
