import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {StudioRepository} from '@video-kit/datasource';
import {ingestVoiceSample} from '@video-kit/backend/voice-files';
import {
  CreateVoiceProfileSchema,
  type EditableVideoSpec,
} from '@video-kit/core/contracts';
import {LANGUAGES, languageFor} from '@video-kit/core/languages';
import {
  extractTranslatableFields,
  protectTerms,
} from '@video-kit/core/localization';

const directory = mkdtempSync(join(tmpdir(), 'video-kit-localization-'));
after(() => rmSync(directory, {recursive: true, force: true}));

const createMaster = (repository: StudioRepository) =>
  repository.createProject({
    title: 'Agentic RAG',
    categoryId: 'tech',
    templateId: 'concept-explainer',
    themeId: 'tech',
    locale: 'hi-IN',
    deliveries: ['youtube-long'],
    script:
      'एजेंटिक RAG उपयोगी जानकारी खोजता है।\n\nफिर एजेंट उत्तर की जाँच करता है।',
  });

test('language registry exposes the seven validated production locales', () => {
  assert.equal(LANGUAGES.length, 7);
  assert.equal(languageFor('ta-IN').indicTransCode, 'tam_Taml');
  assert.equal(languageFor('en-GB').locale, 'en-US');
  assert.equal(languageFor('bn-IN').script, 'Bengali');
  assert.deepEqual(languageFor('en-US').providers.tts, [
    'kokoro',
    'chatterbox',
  ]);
  assert.deepEqual(languageFor('hi-IN').providers.tts, []);
});

test('scene extraction leaves commands, code, identifiers, and values untouched', () => {
  const spec = {
    channel: 'tech',
    slug: 'protected-fields',
    title: 'Protected fields',
    template: 'concept-explainer',
    fps: 30,
    deliveries: ['youtube-long'],
    captions: true,
    scenes: [
      {
        id: 'terminal',
        type: 'terminal',
        durationInFrames: 120,
        title: 'Run the example',
        narration: 'Run this command.',
        entries: [{cmd: 'npm run app'}],
      },
    ],
  } as EditableVideoSpec;
  const fields = extractTranslatableFields(spec);
  assert.ok(fields.some((field) => field.sourceText === 'Run this command.'));
  assert.ok(fields.some((field) => field.sourceText === 'Run the example'));
  assert.ok(!fields.some((field) => field.sourceText === 'npm run app'));
});

test('glossary protection survives provider output', () => {
  const protectedText = protectTerms(
    'Agentic RAG calls OpenAI before generation.',
    ['Agentic RAG', 'OpenAI'],
  );
  assert.match(protectedText.text, /__VK_TERM_0__/);
  assert.equal(
    protectedText.restore(protectedText.text),
    'Agentic RAG calls OpenAI before generation.',
  );
});

test('localized variants require review, become stale, and can become master', () => {
  const repository = new StudioRepository(join(directory, 'variants.db'));
  const master = createMaster(repository);
  const created = repository.createVariant(master.project.id, 'ta-IN');
  assert.equal(created.variant.translationStatus, 'draft');
  const units = repository.listTranslationUnits(created.variant.id);
  assert.ok(units.length >= 2);
  assert.throws(
    () => repository.createRevision(master.project.id, created.variant.id),
    /approval is required/i,
  );

  repository.applyTranslationResults(
    master.project.id,
    created.variant.id,
    units.map((unit, index) => ({
      unitId: unit.id,
      translatedText: `தமிழ் மொழிபெயர்ப்பு ${index + 1}`,
      pivotText: `English pivot ${index + 1}`,
    })),
  );
  const approved = repository.approveVariant(
    master.project.id,
    created.variant.id,
  );
  assert.equal(approved.variant.translationStatus, 'approved');
  assert.doesNotThrow(() =>
    repository.createRevision(master.project.id, created.variant.id),
  );

  const changedSpec = structuredClone(master.variant.spec);
  changedSpec.scenes[0].narration = 'मास्टर वाक्य बदल गया है।';
  repository.updateProject(master.project.id, {spec: changedSpec});
  assert.equal(
    repository.getProject(master.project.id, created.variant.id).variant
      .translationStatus,
    'stale',
  );

  const promoted = repository.promoteVariant(
    master.project.id,
    created.variant.id,
  );
  assert.equal(promoted.project.masterVariantId, created.variant.id);
  assert.equal(promoted.variant.translationStatus, 'approved');
  assert.ok(
    promoted.variants
      .filter((variant) => variant.id !== created.variant.id)
      .every((variant) => variant.translationStatus === 'stale'),
  );
  repository.close();
});

test('voice enrollment requires own-adult attestation and explicit cloud consent', async () => {
  const base = {
    name: 'My voice',
    ownerName: 'Owner',
    consentPhrase:
      'I confirm this is my own adult voice and consent to synthetic speech.',
    provider: 'indicf5' as const,
    model: 'ai4bharat/IndicF5',
    enabledLocales: ['hi-IN'] as const,
    cloudAllowed: false,
  };
  assert.equal(
    CreateVoiceProfileSchema.safeParse({
      ...base,
      adultAttested: false,
      ownershipAttested: true,
    }).success,
    false,
  );
  assert.equal(
    CreateVoiceProfileSchema.safeParse({
      ...base,
      provider: 'elevenlabs',
      adultAttested: true,
      ownershipAttested: true,
    }).success,
    false,
  );

  const repository = new StudioRepository(join(directory, 'voices.db'));
  const profile = repository.createVoiceProfile({
    ...base,
    enabledLocales: ['hi-IN'],
    adultAttested: true,
    ownershipAttested: true,
  });
  assert.equal(profile.status, 'draft');
  assert.equal(profile.activeVersion?.cloudAllowedAt, null);
  await assert.rejects(
    ingestVoiceSample({
      repository,
      profileId: profile.id,
      purpose: 'reference',
      locale: 'hi-IN',
      transcript: 'A sample',
      mimeType: 'text/plain',
      data: Buffer.from('not audio'),
    }),
    /unsupported audio type/i,
  );
  assert.equal(repository.revokeVoiceProfile(profile.id).status, 'revoked');
  repository.close();
});

test('a local F5 profile can clone the owner voice across English and Indic locales', () => {
  const localProfile = {
    name: 'My multilingual voice',
    ownerName: 'Owner',
    consentPhrase:
      'I confirm this is my own adult voice and consent to synthetic speech.',
    provider: 'f5tts' as const,
    model: 'SWivid/F5-TTS + ai4bharat/IndicF5',
    enabledLocales: ['en-US', 'hi-IN', 'ta-IN'] as const,
    cloudAllowed: false,
    adultAttested: true as const,
    ownershipAttested: true as const,
  };
  assert.equal(CreateVoiceProfileSchema.safeParse(localProfile).success, true);
  assert.equal(
    CreateVoiceProfileSchema.safeParse({
      ...localProfile,
      provider: 'indicf5',
      model: 'ai4bharat/IndicF5',
    }).success,
    false,
  );
});
