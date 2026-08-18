import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {createSqliteRepository} from '@video-kit/datasource';
import {
  checkStoredSpecs,
  parseStoredSpec,
  repairStoredSpecs,
} from '@video-kit/datasource/specs';

const directory = mkdtempSync(join(tmpdir(), 'video-kit-stored-'));
after(() => rmSync(directory, {recursive: true, force: true}));

/**
 * Write a spec straight past the schema, the way a row saved before scene
 * bodies were validated would look.
 */
const seedLegacyProject = (name: string) => {
  const repository = createSqliteRepository({
    databasePath: join(directory, `${name}.db`),
  });
  const catalog = repository.catalog();
  const created = repository.createProject({
    title: 'Legacy project',
    categoryId: catalog.categories[0].id,
    themeId: catalog.themes[0].id,
    templateId: catalog.templates[0].id,
    locale: 'en-US',
    deliveries: ['youtube-long'],
    script: 'One paragraph.\n\nTwo paragraph.',
  });
  const spec = JSON.parse(JSON.stringify(created.variant.spec));
  spec.scenes[0].staleField = 'left over';
  spec.scenes.push({type: 'code', durationInFrames: 90, typoedFeild: 'x'});
  repository.database
    .prepare('UPDATE project_variants SET spec_json = ? WHERE id = ?')
    .run(JSON.stringify(spec), created.variant.id);
  return {repository, variantId: created.variant.id, projectId: created.project.id};
};

test('a clean database reports no problems', () => {
  const repository = createSqliteRepository({
    databasePath: join(directory, 'clean.db'),
  });
  after(() => repository.close());
  assert.deepEqual(checkStoredSpecs(repository.database), []);
});

test('a pre-schema spec is reported with its project and its issues', () => {
  const {repository} = seedLegacyProject('reported');
  after(() => repository.close());

  const problems = checkStoredSpecs(repository.database);
  assert.equal(problems.length, 1);
  assert.match(problems[0].label, /Legacy project/);
  assert.equal(problems[0].table, 'project_variants');
  const messages = problems[0].issues.map((issue) => `${issue.path} ${issue.message}`);
  assert.ok(
    messages.some((message) => message.includes('staleField')),
    'the unknown field was not reported',
  );
  assert.ok(
    messages.some((message) => message.startsWith('scenes.2.lines')),
    'the missing required field was not reported',
  );
});

test('repair drops stale fields and refuses to invent content', () => {
  const {repository} = seedLegacyProject('repaired');
  after(() => repository.close());

  const dryRun = repairStoredSpecs(repository.database, {apply: false});
  assert.equal(dryRun.length, 1);
  assert.ok(
    dryRun[0].changes.some((change) => change.includes('dropped unknown field')),
    'stale fields were not dropped',
  );
  assert.ok(
    dryRun[0].unrepairable.some((issue) => issue.includes('lines')),
    'missing content should be reported, not filled in',
  );

  // A dry run must not touch the database.
  assert.equal(checkStoredSpecs(repository.database).length, 1);

  repairStoredSpecs(repository.database, {apply: true});
  const remaining = checkStoredSpecs(repository.database);
  const messages = remaining.flatMap((problem) =>
    problem.issues.map((issue) => `${issue.path} ${issue.message}`),
  );
  assert.ok(
    !messages.some((message) => message.includes('staleField')),
    'the stale field survived the repair',
  );
  assert.ok(
    messages.some((message) => message.includes('lines')),
    'the missing content should still be reported after repair',
  );
});

test('reading a broken spec says which project and what to run', () => {
  const {repository, projectId} = seedLegacyProject('read-error');
  after(() => repository.close());

  assert.throws(
    () => repository.getProject(projectId),
    (error: Error) => {
      assert.match(error.message, /no longer valid/);
      assert.match(error.message, /db:check-specs/);
      assert.match(error.message, /scenes\.2\.lines/);
      return true;
    },
  );
});

test('parseStoredSpec accepts a spec the studio just wrote', () => {
  const repository = createSqliteRepository({
    databasePath: join(directory, 'roundtrip.db'),
  });
  after(() => repository.close());
  const catalog = repository.catalog();
  const created = repository.createProject({
    title: 'Round trip',
    categoryId: catalog.categories[0].id,
    themeId: catalog.themes[0].id,
    templateId: catalog.templates[0].id,
    locale: 'en-US',
    deliveries: ['youtube-long'],
    script: 'One paragraph.\n\nTwo paragraph.',
  });
  const parsed = parseStoredSpec(JSON.stringify(created.variant.spec), 'round trip');
  assert.equal(parsed.scenes.length, created.variant.spec.scenes.length);
});
