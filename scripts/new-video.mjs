#!/usr/bin/env node
/**
 * Scaffold a new video spec.
 *
 *   npm run new -- how-jwt-refresh-works "How JWT refresh actually works"
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const [slug, ...titleParts] = process.argv.slice(2);
if (!slug) {
  console.error('usage: npm run new -- <slug> "Title"');
  process.exit(1);
}
const title = titleParts.join(' ') || slug;
const camel = slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const path = `src/videos/${slug}.ts`;

if (existsSync(path)) {
  console.error(`${path} already exists`);
  process.exit(1);
}

writeFileSync(
  path,
  `import type {VideoSpec} from '../types';

export const ${camel}: VideoSpec = {
  slug: '${slug}',
  title: '${title}',
  summary: '',
  handle: '@AIDataDynamics',
  formats: ['youtube', 'reel'],
  scenes: [
    {
      type: 'title',
      durationInFrames: 80,
      kicker: 'Kicker',
      title: '${title}',
      subtitle: 'One line that earns the next twenty seconds.',
      narration: '',
    },
    {
      type: 'steps',
      durationInFrames: 120,
      kicker: 'The whole idea',
      items: [
        {label: 'First', detail: ''},
        {label: 'Second', detail: ''},
        {label: 'Third', detail: ''},
      ],
      narration: '',
    },
    {
      type: 'outro',
      durationInFrames: 90,
      handle: '@AIDataDynamics',
      tagline: '',
      cta: 'Follow for more',
      narration: '',
    },
  ],
};
`,
);

// Register it so it shows up in Studio without a second manual edit.
const regPath = 'src/videos/registry.ts';
let reg = readFileSync(regPath, 'utf8');
reg = reg.replace(
  "import type {VideoSpec} from '../types';",
  `import type {VideoSpec} from '../types';\nimport {${camel}} from './${slug}';`,
);
reg = reg.replace('export const VIDEOS: VideoSpec[] = [', `export const VIDEOS: VideoSpec[] = [${camel}, `);
writeFileSync(regPath, reg);

console.log(`created ${path} and registered it`);
console.log('next:  npm run studio');
