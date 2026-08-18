#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {VIDEO_PRESETS} from './video-presets.mjs';

const roadmap = JSON.parse(
  readFileSync(new URL('../content/ai-engineer-roadmap.json', import.meta.url), 'utf8'),
);
const topics = roadmap.phases.flatMap((phase) =>
  phase.topics.map((topic) => ({...topic, phaseId: phase.id, phaseTitle: phase.title})),
);
const [command = 'list', query] = process.argv.slice(2);

const findTopic = (value) =>
  topics.find((topic) => topic.id === value || topic.slug === value);

if (command === 'show') {
  const topic = findTopic(query);
  if (!topic) {
    console.error(`unknown topic "${query ?? ''}"`);
    process.exit(1);
  }
  console.log(`${topic.id} · ${topic.title}`);
  console.log(`phase: ${topic.phaseTitle}`);
  console.log(`level: ${topic.level}`);
  console.log(`objective: ${topic.objective}`);
  console.log(`preset: ${topic.recommendedPreset}`);
  console.log(`runtime: ${VIDEO_PRESETS[topic.recommendedPreset].durationSeconds}s`);
  console.log(`scaffold: npm run topic:new -- --topic ${topic.id}`);
  process.exit(0);
}

if (command === 'next') {
  const topic = findTopic(query);
  if (!topic) {
    console.error(`unknown topic "${query ?? ''}"`);
    process.exit(1);
  }
  const next = topics[topics.indexOf(topic) + 1];
  if (!next) {
    console.log('Roadmap complete. Build the capstone and review weak areas.');
  } else {
    console.log(`${next.id} · ${next.title}`);
    console.log(`npm run topic:new -- --topic ${next.id}`);
  }
  process.exit(0);
}

if (command !== 'list') {
  console.error('usage: npm run roadmap -- [list | show <topic-id> | next <topic-id>]');
  process.exit(1);
}

console.log(`# ${roadmap.series.title}\n`);
for (const phase of roadmap.phases) {
  console.log(`${phase.title} (${phase.topics.length})`);
  for (const topic of phase.topics) {
    console.log(
      `  ${topic.id.padEnd(34)} ${topic.recommendedPreset.padEnd(18)} ${topic.title}`,
    );
  }
  console.log('');
}
console.log(`${topics.length} topics · ${roadmap.phases.length} phases`);
