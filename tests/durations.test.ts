import assert from 'node:assert/strict';
import test from 'node:test';
import {ScriptGenerationInputSchema} from '@video-kit/core/contracts';
import {DEFAULT_TEMPLATES} from '@video-kit/core/defaults';
import {
  LONG_FORM_MINUTES,
  MAX_VIDEO_SECONDS,
  musicPlanningWordRange,
  sceneCountForVideo,
  secondsForVideoFormat,
  voiceoverWordRange,
} from '@video-kit/core/durations';
import {createSpecFromScript} from '@video-kit/core/storyboard';

test('long-form presets cover five-minute steps through thirty minutes', () => {
  assert.deepEqual(LONG_FORM_MINUTES, [5, 10, 15, 20, 25, 30]);
  assert.equal(MAX_VIDEO_SECONDS, 1_800);
  assert.deepEqual(
    LONG_FORM_MINUTES.map((minutes) =>
      secondsForVideoFormat('full', minutes),
    ),
    [300, 600, 900, 1_200, 1_500, 1_800],
  );
});

test('long-form script pacing scales scenes and narration to thirty minutes', () => {
  assert.equal(sceneCountForVideo('full', 300), 13);
  assert.equal(sceneCountForVideo('full', 1_800), 63);
  assert.deepEqual(voiceoverWordRange('full', 300), [700, 780]);
  assert.deepEqual(voiceoverWordRange('full', 1_800), [4_200, 4_680]);
  assert.deepEqual(musicPlanningWordRange('full', 1_800), [1_320, 2_160]);
});

test('AI script requests accept only supported duration presets', () => {
  const base = {
    topic: 'LLM fundamentals',
    format: 'full' as const,
    categoryId: 'tech',
    templateId: 'tech-youtube-deep-dive',
    locale: 'en-US' as const,
    audioMode: 'voiceover' as const,
    audienceLevel: 'beginner' as const,
    direction: '',
  };
  assert.equal(
    ScriptGenerationInputSchema.parse({...base, targetSeconds: 1_800})
      .targetSeconds,
    1_800,
  );
  assert.throws(() =>
    ScriptGenerationInputSchema.parse({...base, targetSeconds: 1_799}),
  );
  assert.throws(() =>
    ScriptGenerationInputSchema.parse({
      ...base,
      format: 'reel',
      targetSeconds: 300,
    }),
  );
});

test('a sixty-three-scene storyboard fits an exact thirty-minute timeline', () => {
  const template = DEFAULT_TEMPLATES.find(
    (item) => item.id === 'tech-youtube-deep-dive',
  );
  assert.ok(template);
  const script = Array.from(
    {length: 63},
    (_, index) => `Chapter ${index + 1} explains one clear runtime idea.`,
  ).join('\n\n');
  const spec = createSpecFromScript({
    title: 'Thirty-minute lesson',
    categoryId: 'tech',
    template,
    locale: 'en-US',
    deliveries: ['youtube-long'],
    script,
    targetSeconds: 1_800,
  });
  assert.equal(spec.scenes.length, 63);
  assert.equal(
    spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0),
    54_000,
  );
});
