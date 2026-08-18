import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {createStudioApp} from '../server/app';
import {StudioRepository} from '@video-kit/datasource';
import type {ScriptGenerator} from '../server/openai-script';

const directory = mkdtempSync(join(tmpdir(), 'video-kit-api-'));
after(() => rmSync(directory, {recursive: true, force: true}));

test('project API validates input and returns a resolved editable project', async () => {
  const repository = new StudioRepository(join(directory, 'api.db'));
  const {app} = await createStudioApp({repository});
  const invalid = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: {title: ''},
  });
  assert.equal(invalid.statusCode, 400);

  const created = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: {
      title: 'How RAG works',
      categoryId: 'tech',
      templateId: 'concept-explainer',
      themeId: 'tech',
      locale: 'en-US',
      deliveries: ['youtube-long'],
      script: 'Retrieve useful context.\n\nGenerate a grounded answer.',
    },
  });
  assert.equal(created.statusCode, 201);
  const body = created.json();
  assert.equal(body.project.title, 'How RAG works');
  assert.equal(body.variant.spec.scenes.length, 2);
  await app.close();
});

test('artifact endpoint rejects unknown ids without accepting file paths', async () => {
  const repository = new StudioRepository(join(directory, 'security.db'));
  const {app} = await createStudioApp({repository});
  const response = await app.inject({
    method: 'GET',
    url: '/api/artifacts/00000000-0000-4000-8000-000000000000/download',
  });
  assert.equal(response.statusCode, 404);
  await app.close();
});

test('music library exposes managed local tracks and rejects unknown ids', async () => {
  const repository = new StudioRepository(join(directory, 'music-api.db'));
  const {app} = await createStudioApp({repository});
  const library = await app.inject({method: 'GET', url: '/api/music'});
  assert.equal(library.statusCode, 200);
  assert.ok(library.json().length >= 3);
  assert.ok(
    library
      .json()
      .every((track: {src: string}) => track.src.startsWith('audio/music/')),
  );
  const missing = await app.inject({
    method: 'GET',
    url: '/api/music/not-a-track/audio',
  });
  assert.equal(missing.statusCode, 404);
  await app.close();
});

test('language and voice APIs enforce supported locales and consent', async () => {
  const repository = new StudioRepository(join(directory, 'language-api.db'));
  const {app} = await createStudioApp({repository});
  const languages = await app.inject({method: 'GET', url: '/api/languages'});
  assert.equal(languages.statusCode, 200);
  assert.equal(languages.json().languages.length, 7);

  const rejected = await app.inject({
    method: 'POST',
    url: '/api/voices',
    payload: {
      name: 'Someone else',
      ownerName: 'Unknown',
      adultAttested: true,
      ownershipAttested: false,
      consentPhrase:
        'I confirm this is a consent phrase long enough for validation.',
      provider: 'indicf5',
      model: 'ai4bharat/IndicF5',
      enabledLocales: ['hi-IN'],
      cloudAllowed: false,
    },
  });
  assert.equal(rejected.statusCode, 400);

  const cloudRejected = await app.inject({
    method: 'POST',
    url: '/api/voices',
    payload: {
      name: 'My cloud voice',
      ownerName: 'Owner',
      adultAttested: true,
      ownershipAttested: true,
      consentPhrase:
        'I confirm this is my own adult voice and consent to synthetic speech.',
      provider: 'elevenlabs',
      model: 'eleven_multilingual_v2',
      enabledLocales: ['hi-IN'],
      cloudAllowed: false,
    },
  });
  assert.equal(cloudRejected.statusCode, 400);

  const legacyCloningDisabled = await app.inject({
    method: 'POST',
    url: '/api/voices',
    payload: {
      name: 'My local clone',
      ownerName: 'Owner',
      adultAttested: true,
      ownershipAttested: true,
      consentPhrase:
        'I confirm this is my own adult voice and consent to synthetic speech.',
      provider: 'f5tts',
      model: 'SWivid/F5-TTS',
      enabledLocales: ['en-US'],
      cloudAllowed: false,
    },
  });
  assert.equal(legacyCloningDisabled.statusCode, 400);

  const myVoice = await app.inject({
    method: 'POST',
    url: '/api/voices',
    payload: {
      name: 'My local voice',
      ownerName: 'Owner',
      adultAttested: true,
      ownershipAttested: true,
      consentPhrase:
        'I confirm this is my own adult voice and consent to synthetic speech.',
      provider: 'chatterbox',
      model: 'ResembleAI/chatterbox',
      enabledLocales: ['en-US'],
      cloudAllowed: false,
    },
  });
  assert.equal(myVoice.statusCode, 201);
  assert.equal(myVoice.json().activeVersion.provider, 'chatterbox');
  await app.close();
});

test('script generation is server-side, validated, and returns a reviewable draft', async () => {
  const generator: ScriptGenerator = {
    status: () => ({
      configured: true,
      provider: 'openai',
      model: 'test-model',
      detail: 'Ready for tests.',
    }),
    generate: async (input, context) => ({
      title: `${input.topic} explained`,
      summary: `A ${input.format} script for ${context.category.label}.`,
      scenes: [
        {
          sceneType: 'title',
          purpose: 'Hook the learner.',
          narration: 'Start with a useful question.',
          visualDirection: 'Reveal the question as the central title.',
          onScreenText: 'Useful question',
          visualLabels: [],
          codeVisual: '',
        },
        {
          sceneType: 'callout',
          purpose: 'Explain runtime behavior.',
          narration: 'Explain the runtime behavior with one concrete example.',
          visualDirection: 'Trace the example from input to output.',
          onScreenText: 'Runtime trace',
          visualLabels: ['Input', 'Runtime', 'Output'],
          codeVisual: 'print("example")',
        },
        {
          sceneType: 'outro',
          purpose: 'Recap and bridge.',
          narration: 'Recap the idea and suggest the next learning step.',
          visualDirection: 'Collect the lesson into one final rule.',
          onScreenText: 'One rule',
          visualLabels: [],
          codeVisual: '',
        },
      ],
      paragraphs: [
        'Start with a useful question.',
        'Explain the runtime behavior with one concrete example.',
        'Recap the idea and suggest the next learning step.',
      ],
      reviewChecklist: [
        'Run the example before production.',
        'Review technical claims.',
      ],
      script:
        'Start with a useful question.\n\nExplain the runtime behavior with one concrete example.\n\nRecap the idea and suggest the next learning step.',
      wordCount: 23,
      targetSeconds: input.targetSeconds ?? (input.format === 'reel' ? 60 : 300),
      model: 'test-model',
      contextVersion: 'test-context',
    }),
  };
  const repository = new StudioRepository(join(directory, 'script-api.db'));
  const {app} = await createStudioApp({repository, scriptGenerator: generator});

  const status = await app.inject({
    method: 'GET',
    url: '/api/script-generation/status',
  });
  assert.equal(status.statusCode, 200);
  assert.deepEqual(status.json(), {
    configured: true,
    provider: 'openai',
    model: 'test-model',
    detail: 'Ready for tests.',
  });

  const invalid = await app.inject({
    method: 'POST',
    url: '/api/script-generation/generate',
    payload: {topic: 'AI'},
  });
  assert.equal(invalid.statusCode, 400);

  const generated = await app.inject({
    method: 'POST',
    url: '/api/script-generation/generate',
    payload: {
      topic: 'Python decorators',
      format: 'reel',
      categoryId: 'tech',
      templateId: 'tech-reel-concept',
      locale: 'en-US',
      audienceLevel: 'beginner',
      direction: 'Use a practical web API example.',
    },
  });
  assert.equal(generated.statusCode, 200);
  assert.equal(generated.json().targetSeconds, 60);
  assert.equal(generated.json().model, 'test-model');
  assert.equal(generated.json().paragraphs.length, 3);

  const longGenerated = await app.inject({
    method: 'POST',
    url: '/api/script-generation/generate',
    payload: {
      topic: 'LLM fundamentals',
      format: 'full',
      targetSeconds: 1_800,
      categoryId: 'tech',
      templateId: 'tech-youtube-deep-dive',
      locale: 'en-US',
      audienceLevel: 'beginner',
      direction: 'Build from tokens to inference.',
    },
  });
  assert.equal(longGenerated.statusCode, 200);
  assert.equal(longGenerated.json().targetSeconds, 1_800);

  const unsupportedDuration = await app.inject({
    method: 'POST',
    url: '/api/script-generation/generate',
    payload: {
      topic: 'LLM fundamentals',
      format: 'full',
      targetSeconds: 1_799,
      categoryId: 'tech',
      templateId: 'tech-youtube-deep-dive',
      locale: 'en-US',
    },
  });
  assert.equal(unsupportedDuration.statusCode, 400);
  await app.close();
});
