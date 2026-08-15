import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  VIDEO_PRESETS,
  buildVideoSpec,
  presetIds,
  renderScriptTemplate,
  renderVideoSource,
} from '../scripts/video-presets.mjs';

const roadmap = JSON.parse(
  readFileSync('content/ai-engineer-roadmap.json', 'utf8'),
) as {
  phases: Array<{
    id: string;
    topics: Array<{
      id: string;
      slug: string;
      title: string;
      objective: string;
      level: 'beginner' | 'intermediate' | 'advanced';
      recommendedPreset: string;
    }>;
  }>;
};

test('roadmap topic ids and slugs are unique and use known presets', () => {
  const topics = roadmap.phases.flatMap((phase) => phase.topics);
  assert.ok(topics.length >= 60);
  assert.equal(new Set(topics.map((topic) => topic.id)).size, topics.length);
  assert.equal(new Set(topics.map((topic) => topic.slug)).size, topics.length);
  for (const topic of topics) {
    assert.match(topic.id, /^[a-z0-9-]+\.[a-z0-9-]+$/);
    assert.match(topic.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(
      presetIds.includes(topic.recommendedPreset as (typeof presetIds)[number]),
    );
  }
});

test('every production preset has an exact timeline and complete narration slots', () => {
  for (const presetId of presetIds) {
    const spec = buildVideoSpec({
      channel: 'tech',
      slug: `test-${presetId}`,
      title: `Test ${presetId}`,
      objective: 'Test the preset timeline.',
      level: 'beginner',
      presetId,
    });
    const frames = spec.scenes.reduce(
      (total, scene) => total + scene.durationInFrames,
      0,
    );
    assert.equal(frames, VIDEO_PRESETS[presetId].durationSeconds * 30);
    assert.ok(spec.scenes.every((scene) => scene.narration?.trim()));
    assert.ok(spec.scenes[0].durationInFrames <= 96);
    assert.deepEqual(spec.deliveries, VIDEO_PRESETS[presetId].deliveries);
  }
});

test('preset renderers produce a typed source file and timed writing brief', () => {
  const spec = buildVideoSpec({
    channel: 'tech',
    slug: 'python-async-await',
    title: 'Async and Await in Python',
    objective: 'Explain coroutines and the event loop.',
    level: 'intermediate',
    presetId: 'reel-code',
  });
  const source = renderVideoSource({exportName: 'pythonAsyncAwait', spec});
  const brief = renderScriptTemplate({
    topicId: 'python.async-await',
    presetId: 'reel-code',
    spec,
  });
  assert.match(source, /export const pythonAsyncAwait: VideoSpec/);
  assert.match(source, /"durationInFrames": 300/);
  assert.match(brief, /Runtime: 59s/);
  assert.match(brief, /npm run voice -- tech\/python-async-await/);
});
