#!/usr/bin/env node
/**
 * Scaffold and register a channel-aware video.
 *
 * npm run new -- --channel tech --template concept-explainer \
 *   how-jwt-works "How JWT refresh works"
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? fallback : argv[index + 1];
};
const positionals = argv.filter((arg, index) => {
  if (arg.startsWith('--')) return false;
  return !['--channel', '--template'].includes(argv[index - 1]);
});

const channels = {
  tech: {
    exportName: 'TECH_VIDEOS',
    defaultTemplate: 'concept-explainer',
    deliveries: "['youtube-long', 'instagram-reel']",
  },
  learn: {
    exportName: 'LEARN_VIDEOS',
    defaultTemplate: 'why-does-this-happen',
    deliveries: "['youtube-short', 'instagram-reel']",
  },
  fun: {
    exportName: 'FUN_VIDEOS',
    defaultTemplate: 'did-you-know',
    deliveries: "['youtube-short', 'instagram-reel']",
  },
};

const channelId = value('channel', 'tech');
const channel = channels[channelId];
if (!channel) {
  console.error(`unknown channel "${channelId}". use: tech, learn, or fun`);
  process.exit(1);
}

const [slug, ...titleParts] = positionals;
if (!slug) {
  console.error(
    'usage: npm run new -- --channel <tech|learn|fun> [--template name] <slug> "Title"',
  );
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('slug must be lowercase kebab-case');
  process.exit(1);
}

const title = titleParts.join(' ') || slug;
const template = value('template', channel.defaultTemplate);
const camel = slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
const dir = `src/videos/${channelId}`;
const path = `${dir}/${slug}.ts`;
const literal = (text) => JSON.stringify(text);

if (existsSync(path)) {
  console.error(`${path} already exists`);
  process.exit(1);
}

const channelMetadata =
  channelId === 'learn'
    ? `  audience: {ageBand: '9–12', level: 'beginner'},
  editorial: {
    language: 'en',
    objective: 'TODO: one measurable learning objective',
    safetyStatus: 'draft',
  },`
    : `  audience: {level: 'beginner'},
  editorial: {
    language: 'en',
    objective: 'TODO: what should the viewer understand or feel?',
  },`;

const middleScene =
  template === 'quick-quiz' || template === 'guess-before-the-reveal'
    ? `    {
      type: 'quiz',
      durationInFrames: 150,
      question: 'TODO: the question',
      options: [
        {label: 'Option A', emoji: '🅰️'},
        {label: 'Option B', emoji: '🅱️'},
      ],
      answerIndex: 0,
      explanation: 'TODO: why the answer is right',
      narration: '',
    },`
    : channelId === 'fun'
    ? `    {
      type: 'compare',
      durationInFrames: 90,
      kicker: 'Pick one',
      left: {heading: 'Option A', points: ['first clue'], accent: 'info'},
      right: {heading: 'Option B', points: ['second clue'], accent: 'attention'},
    },`
    : `    {
      type: 'steps',
      durationInFrames: 120,
      kicker: 'The whole idea',
      items: [
        {label: 'First', detail: '', accent: 'attention'},
        {label: 'Second', detail: '', accent: 'primary'},
        {label: 'Third', detail: '', accent: 'success'},
      ],
      narration: '',
    },`;

mkdirSync(dir, {recursive: true});
writeFileSync(
  path,
  `import type {VideoSpec} from '../../types';

export const ${camel}: VideoSpec = {
  channel: '${channelId}',
  slug: '${slug}',
  title: ${literal(title)},
  template: ${literal(template)},
  summary: '',
  deliveries: ${channel.deliveries},
  audio: 'audio/${channelId}/${slug}/master.wav',
  captionTimings: 'audio/${channelId}/${slug}/words.json',
${channelMetadata}
  scenes: [
    {
      type: 'title',
      durationInFrames: 80,
      kicker: 'Hook',
      title: ${literal(title)},
      subtitle: 'One line that earns the next twenty seconds.',
      narration: '',
    },
${middleScene}
    {
      type: 'outro',
      durationInFrames: 90,
      tagline: '',
      narration: '',
    },
  ],
};
`,
);

const registryPath = `${dir}/registry.ts`;
let registry = readFileSync(registryPath, 'utf8');
registry = registry.replace(
  '// video-imports',
  `// video-imports\nimport {${camel}} from './${slug}';`,
);
registry = registry.replace(
  '  // videos',
  `  ${camel},\n  // videos`,
);
writeFileSync(registryPath, registry);

console.log(`created ${path}`);
console.log(`registered in ${registryPath}`);
console.log(`next: npm run validate -- ${channelId}/${slug}`);
