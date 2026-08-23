import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {MIGRATIONS_DIR, StudioRepository} from '@video-kit/datasource';

const directory = mkdtempSync(join(tmpdir(), 'video-kit-studio-'));
after(() => rmSync(directory, {recursive: true, force: true}));

test('migrations and seeds are idempotent', () => {
  const path = join(directory, 'seed.db');
  const first = new StudioRepository(path);
  assert.equal(first.listCategories().length, 3);
  assert.equal(first.listThemes().length, 3);
  assert.ok(
    first
      .listTemplates()
      .some((template) => template.id === 'tech-reel-code'),
  );
  assert.ok(
    first
      .listTemplates()
      .some((template) => template.id === 'tech-youtube-deep-dive'),
  );
  assert.ok(
    first
      .listTemplates()
      .some(
        (template) =>
          template.id === 'tech-youtube-deep-dive' &&
          template.definition.label ===
            'Tech YouTube — 5–30-minute deep dive',
      ),
  );
  assert.ok(
    first
      .listCategories()
      .every((category) => category.editorial.maxSeconds === 1_800),
  );
  const tech = first.listCategories().find((category) => category.id === 'tech');
  assert.equal(tech?.voice.speed, 1);
  assert.equal(tech?.voice.maxSpeed, 1);
  assert.equal(tech?.editorial.maxNarrationWpm, 165);
  first.close();
  const second = new StudioRepository(path);
  assert.equal(second.listCategories().length, 3);
  assert.equal(second.listThemes().length, 3);
  second.close();
});

test('an existing version-one database upgrades without losing projects', () => {
  const path = join(directory, 'upgrade.db');
  const database = new Database(path);
  database.exec(readFileSync(join(MIGRATIONS_DIR, '001_initial.sql'), 'utf8'));
  database
    .prepare(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
    )
    .run('001_initial.sql', new Date().toISOString());
  database.close();
  const repository = new StudioRepository(path);
  const columns = repository.database
    .prepare('PRAGMA table_info(project_variants)')
    .all() as Array<{name: string}>;
  assert.ok(columns.some((column) => column.name === 'translation_status'));
  assert.equal(repository.listVoiceProfiles().length, 0);
  repository.close();
});

test('long-form migration upgrades untouched built-in catalog records', () => {
  const path = join(directory, 'long-form-upgrade.db');
  const database = new Database(path);
  for (const migration of [
    '001_initial.sql',
    '002_multilingual_voice.sql',
    '003_repair_voice_sample_selection.sql',
    '004_uploaded_narrations.sql',
    '005_narration_usage.sql',
  ]) {
    database.exec(readFileSync(join(MIGRATIONS_DIR, migration), 'utf8'));
    database
      .prepare(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      )
      .run(migration, '2026-08-01T00:00:00.000Z');
  }
  const oldTemplate = {
    id: 'tech-youtube-deep-dive',
    label: 'Tech YouTube — five-minute deep dive',
    description: 'Old built-in template',
    slots: [
      {
        id: 'chapter',
        label: 'Chapter',
        sceneType: 'steps',
        durationSeconds: 30,
        required: true,
        repeatable: true,
        defaultProps: {},
      },
    ],
  };
  database
    .prepare(
      `INSERT INTO templates
        (id, label, active_version_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      oldTemplate.id,
      oldTemplate.label,
      `${oldTemplate.id}-v1`,
      '2026-08-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    );
  database
    .prepare(
      `INSERT INTO template_versions
        (id, template_id, version, definition_json, created_at)
       VALUES (?, ?, 1, ?, ?)`,
    )
    .run(
      `${oldTemplate.id}-v1`,
      oldTemplate.id,
      JSON.stringify(oldTemplate),
      '2026-08-01T00:00:00.000Z',
    );
  database
    .prepare(
      `INSERT INTO categories
        (id, definition_json, created_at, updated_at)
       VALUES ('tech', ?, ?, ?)`,
    )
    .run(
      JSON.stringify({
        id: 'tech',
        editorial: {minSeconds: 20, maxSeconds: 480, maxNarrationWpm: 220},
      }),
      '2026-08-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    );
  database.close();

  const repository = new StudioRepository(path);
  const upgradedTemplate = repository.database
    .prepare('SELECT label, active_version_id FROM templates WHERE id = ?')
    .get('tech-youtube-deep-dive') as {
      label: string;
      active_version_id: string;
    };
  const upgradedCategory = repository.database
    .prepare('SELECT definition_json FROM categories WHERE id = ?')
    .get('tech') as {definition_json: string};
  assert.equal(
    upgradedTemplate.label,
    'Tech YouTube — 5–30-minute deep dive',
  );
  assert.equal(upgradedTemplate.active_version_id, 'tech-youtube-deep-dive-v2');
  assert.equal(
    JSON.parse(upgradedCategory.definition_json).editorial.maxSeconds,
    1_800,
  );
  repository.close();
});

test('upgrade keeps the newest valid consent and reference takes active', () => {
  const path = join(directory, 'voice-repair.db');
  const database = new Database(path);
  database.exec(readFileSync(join(MIGRATIONS_DIR, '001_initial.sql'), 'utf8'));
  database.exec(readFileSync(join(MIGRATIONS_DIR, '002_multilingual_voice.sql'), 'utf8'));
  const timestamp = '2026-08-01T10:00:00.000Z';
  database
    .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
    .run('001_initial.sql', timestamp);
  database
    .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
    .run('002_multilingual_voice.sql', timestamp);
  database
    .prepare(
      `INSERT INTO voice_profiles
        (id, name, owner_name, status, active_version_id, created_at, updated_at)
       VALUES ('profile', 'Voice', 'Owner', 'draft', 'version', ?, ?)`,
    )
    .run(timestamp, timestamp);
  database
    .prepare(
      `INSERT INTO voice_consents
        (id, profile_id, version, phrase_text, recording_path,
         recording_checksum, adult_attested, ownership_attested, consented_at)
       VALUES ('consent', 'profile', 1, 'phrase', '/invalid-consent.wav',
         'invalid-consent', 1, 1, ?)`,
    )
    .run(timestamp);
  const insertSample = database.prepare(
    `INSERT INTO voice_samples
      (id, profile_id, purpose, locale, transcript, path, mime_type,
       duration_seconds, checksum, quality_json, created_at)
     VALUES (?, 'profile', ?, 'en-US', 'text', ?, 'audio/wav', ?, ?, ?, ?)`,
  );
  insertSample.run(
    'valid-consent',
    'consent',
    '/valid-consent.wav',
    20,
    'valid-consent-checksum',
    JSON.stringify({valid: true, issues: [], sizeBytes: 100}),
    '2026-08-01T10:01:00.000Z',
  );
  insertSample.run(
    'invalid-consent',
    'consent',
    '/invalid-consent.wav',
    70,
    'invalid-consent-checksum',
    JSON.stringify({valid: false, issues: ['too long'], sizeBytes: 100}),
    '2026-08-01T10:02:00.000Z',
  );
  insertSample.run(
    'valid-reference',
    'reference',
    '/valid-reference.wav',
    40,
    'valid-reference-checksum',
    JSON.stringify({valid: true, issues: [], sizeBytes: 100}),
    '2026-08-01T10:03:00.000Z',
  );
  database
    .prepare(
      `INSERT INTO voice_profile_versions
        (id, profile_id, version, provider, model, primary_sample_id,
         consent_id, enabled_locales_json, created_at)
       VALUES ('version', 'profile', 1, 'f5tts', 'model', NULL,
         'consent', '["en-US"]', ?)`,
    )
    .run(timestamp);
  database.close();

  const repository = new StudioRepository(path);
  const consent = repository.database
    .prepare(
      'SELECT recording_checksum FROM voice_consents WHERE id = ?',
    )
    .get('consent') as {recording_checksum: string};
  assert.equal(consent.recording_checksum, 'valid-consent-checksum');
  assert.equal(
    repository.getVoiceProfileVersion('version').primarySampleId,
    'valid-reference',
  );
  repository.close();
});

test('projects persist and revisions are immutable snapshots', () => {
  const repository = new StudioRepository(join(directory, 'projects.db'));
  const project = repository.createProject({
    title: 'Context engineering',
    categoryId: 'tech',
    templateId: 'concept-explainer',
    themeId: 'tech',
    locale: 'en-US',
    deliveries: ['youtube-long', 'instagram-reel'],
    script: 'A concise hook.\n\nA useful explanation.',
  });
  const revision = repository.createRevision(
    project.project.id,
    project.variant.id,
  );
  repository.updateProject(project.project.id, {
    title: 'Changed after snapshot',
  });
  assert.equal(
    repository.getRevision(revision.id).spec.title,
    'Context engineering',
  );
  assert.equal(repository.getProject(project.project.id).project.title, 'Changed after snapshot');
  repository.close();
});

test('uploaded narration can be selected without a voice profile', () => {
  const repository = new StudioRepository(join(directory, 'narration.db'));
  const project = repository.createProject({
    title: 'Uploaded narration test',
    categoryId: 'tech',
    templateId: 'concept-explainer',
    themeId: 'tech',
    locale: 'en-US',
    deliveries: ['youtube-short'],
    script: 'First scene.\n\nSecond scene.',
    targetSeconds: 30,
  });
  const narration = repository.addNarrationAsset({
    label: 'Finished narration',
    locale: 'en-US',
    originalFilename: 'narration.mp3',
    path: join(directory, 'narration.wav'),
    mimeType: 'audio/wav',
    durationSeconds: 30,
    checksum: 'checksum',
    sizeBytes: 1_000,
  });
  repository.updateVariant(project.project.id, project.variant.id, {
    narrationAssetId: narration.id,
    voiceProfileVersionId: null,
  });
  const job = repository.createJob(
    project.project.id,
    project.variant.id,
    true,
    {provider: 'uploaded'},
  );
  assert.equal(job.provider, 'uploaded');
  assert.equal(
    repository.getRevision(job.revisionId).variant.narrationAssetId,
    narration.id,
  );
  repository.close();
});

test('music-only jobs preserve the selected soundtrack and do not select a voice provider', () => {
  const repository = new StudioRepository(join(directory, 'music-only.db'));
  const project = repository.createProject({
    title: 'Visual music test',
    categoryId: 'tech',
    templateId: 'concept-explainer',
    themeId: 'tech',
    locale: 'en-US',
    deliveries: ['youtube-short'],
    script: 'Show the input.\n\nAnimate the transformation.',
    targetSeconds: 30,
  });
  repository.updateVariant(project.project.id, project.variant.id, {
    spec: {
      ...project.variant.spec,
      captions: false,
      soundtrack: {
        music: {
          src: 'audio/music/momentum-grid.m4a',
          credit: 'Video Kit — Momentum Grid',
          license: 'Original project-generated instrumental',
          loop: true,
          volume: 0.9,
        },
      },
    },
  });
  const job = repository.createJob(
    project.project.id,
    project.variant.id,
    false,
  );
  assert.equal(job.generateVoice, false);
  assert.equal(job.provider, null);
  assert.equal(
    repository.getRevision(job.revisionId).spec.soundtrack?.music?.src,
    'audio/music/momentum-grid.m4a',
  );
  repository.close();
});

test('theme cloning creates independent immutable versions', () => {
  const repository = new StudioRepository(join(directory, 'themes.db'));
  const clone = repository.cloneTheme('tech', 'tech-night', 'Tech Night');
  assert.equal(clone.version, 1);
  const changed = {
    ...clone.definition,
    accents: {...clone.definition.accents, primary: '#00ff88'},
  };
  const version = repository.versionTheme('tech-night', changed);
  assert.equal(version.version, 2);
  assert.equal(version.definition.accents.primary, '#00ff88');
  assert.equal(
    repository.listThemes().find((item) => item.id === 'tech')?.definition.accents
      .primary,
    '#f5a524',
  );
  repository.close();
});
