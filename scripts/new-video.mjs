#!/usr/bin/env node
/**
 * Scaffold a production video and its timed writing brief.
 *
 * Roadmap topic:
 *   npm run topic:new -- --topic python.async-await
 *
 * Ad-hoc topic:
 *   npm run new -- --preset reel-concept my-topic "My Topic"
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {
  VIDEO_PRESETS,
  buildVideoSpec,
  presetIds,
  renderScriptTemplate,
  renderVideoSource,
} from './video-presets.mjs';

const argv = process.argv.slice(2);
const valueFlags = new Set(['channel', 'preset', 'topic', 'objective', 'level']);
const values = new Map();
const positionals = [];
for (let index = 0; index < argv.length; index++) {
  const arg = argv[index];
  if (!arg.startsWith('--')) {
    positionals.push(arg);
    continue;
  }
  const name = arg.slice(2);
  if (!valueFlags.has(name)) continue;
  const next = argv[index + 1];
  if (!next || next.startsWith('--')) {
    console.error(`--${name} requires a value`);
    process.exit(1);
  }
  values.set(name, next);
  index++;
}

const help = argv.includes('--help') || argv.includes('-h');
const dryRun = argv.includes('--dry-run');
const roadmap = JSON.parse(
  readFileSync(new URL('../content/ai-engineer-roadmap.json', import.meta.url), 'utf8'),
);
const topics = roadmap.phases.flatMap((phase) =>
  phase.topics.map((topic) => ({...topic, phaseId: phase.id, phaseTitle: phase.title})),
);
const requestedTopic = values.get('topic');
const topic = requestedTopic
  ? topics.find((entry) => entry.id === requestedTopic || entry.slug === requestedTopic)
  : null;

if (requestedTopic && !topic) {
  console.error(`unknown roadmap topic "${requestedTopic}"`);
  console.error('run `npm run roadmap` to list valid topic ids');
  process.exit(1);
}

if (help || (!topic && positionals.length === 0)) {
  console.log(`usage:
  npm run topic:new -- --topic <roadmap-id> [--preset <preset>] [--dry-run]
  npm run new -- [--channel tech] [--preset <preset>] <slug> "Title"

presets:
  ${presetIds.join('\n  ')}

examples:
  npm run topic:new -- --topic python.async-await
  npm run topic:new -- --topic agents.agentic-rag --preset youtube-deep-dive
  npm run new -- --preset reel-compare rag-vs-fine-tuning "RAG vs Fine-Tuning"`);
  process.exit(help ? 0 : 1);
}

const [positionalSlug, ...titleParts] = positionals;
const channel = values.get('channel') ?? roadmap.series.channel ?? 'tech';
if (!['tech', 'learn', 'fun'].includes(channel)) {
  console.error(`unknown channel "${channel}". use: tech, learn, or fun`);
  process.exit(1);
}
const slug = topic?.slug ?? positionalSlug;
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '')) {
  console.error('slug must be lowercase kebab-case');
  process.exit(1);
}
const title = topic?.title ?? (titleParts.join(' ') || slug);
const presetId =
  values.get('preset') ?? topic?.recommendedPreset ?? 'reel-concept';
if (!VIDEO_PRESETS[presetId]) {
  console.error(`unknown preset "${presetId}". use: ${presetIds.join(', ')}`);
  process.exit(1);
}
const level = values.get('level') ?? topic?.level ?? 'beginner';
if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
  console.error('--level must be beginner, intermediate, or advanced');
  process.exit(1);
}
const objective =
  values.get('objective') ??
  topic?.objective ??
  `Explain ${title} with a correct mental model and one practical example.`;
const exportName = slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
const videoDir = `src/videos/${channel}`;
const videoPath = `${videoDir}/${slug}.ts`;
const scriptDir = `content/scripts/${channel}`;
const scriptPath = `${scriptDir}/${slug}.md`;
const registryPath = `${videoDir}/registry.ts`;
const spec = buildVideoSpec({
  channel,
  slug,
  title,
  objective,
  level,
  presetId,
});

if (dryRun) {
  console.log(JSON.stringify({
    topic: topic?.id ?? null,
    phase: topic?.phaseTitle ?? null,
    preset: presetId,
    videoPath,
    scriptPath,
    durationSeconds: VIDEO_PRESETS[presetId].durationSeconds,
    deliveries: spec.deliveries,
  }, null, 2));
  process.exit(0);
}

if (existsSync(videoPath) || existsSync(scriptPath)) {
  console.error(
    [
      existsSync(videoPath) ? `${videoPath} already exists` : null,
      existsSync(scriptPath) ? `${scriptPath} already exists` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exit(1);
}
if (!existsSync(registryPath)) {
  console.error(`missing registry ${registryPath}`);
  process.exit(1);
}

let registry = readFileSync(registryPath, 'utf8');
if (!registry.includes('// video-imports') || !registry.includes('  // videos')) {
  console.error(`${registryPath} is missing generator anchors`);
  process.exit(1);
}
if (registry.includes(`from './${slug}'`)) {
  console.error(`${slug} is already registered in ${registryPath}`);
  process.exit(1);
}

mkdirSync(videoDir, {recursive: true});
mkdirSync(scriptDir, {recursive: true});
writeFileSync(videoPath, renderVideoSource({exportName, spec}));
writeFileSync(
  scriptPath,
  renderScriptTemplate({topicId: topic?.id, presetId, spec}),
);
registry = registry.replace(
  '// video-imports',
  `// video-imports\nimport {${exportName}} from './${slug}';`,
);
registry = registry.replace('  // videos', `  ${exportName},\n  // videos`);
writeFileSync(registryPath, registry);

console.log(`created ${videoPath}`);
console.log(`created ${scriptPath}`);
console.log(`registered in ${registryPath}`);
console.log(`preset ${presetId} · ${VIDEO_PRESETS[presetId].durationSeconds}s`);
console.log(`next: replace TODO markers, add sources, then run:`);
console.log(`  npm run validate -- ${channel}/${slug}`);
console.log(`  npm run voice -- ${channel}/${slug}`);
console.log(`  npm run render -- ${channel}/${slug}`);
