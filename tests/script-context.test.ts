import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contextForGeneration,
  loadScriptContext,
} from '../server/script-context';

test('script generation context captures the established curriculum and reel rhythm', () => {
  const context = loadScriptContext();
  const reel = contextForGeneration(context, 'tech', 'reel');

  assert.equal(reel.contextVersion, 'video-kit-script-context-v5');
  assert.equal(reel.format.sceneCount, 8);
  assert.deepEqual(reel.format.wordRange, [135, 150]);
  assert.ok(reel.curriculum.includes('Agentic RAG'));
  assert.ok(
    reel.globalRules.some((rule) => rule.includes('runtime')),
  );
  assert.ok(
    reel.globalRules.some((rule) => rule.includes('exact line')),
  );
  assert.ok(
    reel.globalRules.some((rule) => rule.includes('diamonds for decisions')),
  );
  assert.equal(reel.examples[0]?.name, 'Python Before AI Engineering');
});

test('category context changes audience and tone without losing shared rules', () => {
  const context = loadScriptContext();
  const learn = contextForGeneration(context, 'learn', 'full');

  assert.match(learn.category.audience, /Children and students/);
  assert.equal(learn.format.sceneCount, 13);
  assert.ok(learn.globalRules.length >= 8);
});
