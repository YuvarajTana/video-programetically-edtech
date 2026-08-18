import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {createSqliteRepository, type Repository} from '@video-kit/datasource';

const directory = mkdtempSync(join(tmpdir(), 'video-kit-artifacts-'));
after(() => rmSync(directory, {recursive: true, force: true}));

/**
 * A repository whose writes settle on a real tick, the way the HTTP datasource
 * behaves. The embedded SQLite adapter resolves in a microtask, which hides
 * unawaited writes; this does not.
 */
const withLatency = (repository: Repository): Repository =>
  new Proxy(repository as object, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (typeof value !== 'function') return value;
      const method = String(property);
      return async (...args: unknown[]) => {
        if (method === 'addArtifact') {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  }) as Repository;

test('an artifact write is visible to the next read', async () => {
  const embedded = createSqliteRepository({
    databasePath: join(directory, 'artifacts.db'),
  });
  const repository = withLatency(embedded);
  after(() => embedded.close());

  const catalog = await repository.catalog();
  const created = await repository.createProject({
    title: 'Artifact ordering',
    categoryId: catalog.categories[0].id,
    themeId: catalog.themes[0].id,
    templateId: catalog.templates[0].id,
    locale: 'en-US',
    deliveries: ['youtube-long'],
    script: 'One paragraph.\n\nTwo paragraph.',
  });
  const revision = await repository.createRevision(
    created.project.id,
    created.variant.id,
  );
  const job = await repository.createJob(
    created.project.id,
    created.variant.id,
    false,
    {},
  );

  const file = join(directory, 'artifact.txt');
  writeFileSync(file, 'contents');

  // This mirrors what the render stage does: record every produced artifact,
  // then have QA and packaging read the list back. If the writes are not
  // awaited, the reader sees an incomplete list.
  const names = ['first', 'second', 'third'];
  for (const name of names) {
    await repository.addArtifact(job.id, {
      kind: 'video',
      deliveryId: null,
      filename: `${name}.txt`,
      path: file,
      mimeType: 'text/plain',
      sizeBytes: 8,
      checksum: name,
    });
  }

  const listed = await repository.listArtifacts(job.id);
  assert.equal(
    listed.length,
    names.length,
    'an artifact write had not landed by the time the list was read',
  );
  assert.deepEqual(
    listed.map((artifact) => artifact.filename).sort(),
    names.map((name) => `${name}.txt`).sort(),
  );
  assert.ok(revision.id, 'revision was not created');
});

test('every artifact write in the job runner is awaited', async () => {
  // The QA, manifest and zip stages all read listArtifacts, so a floating
  // write can silently drop an artifact from the package. Guard the source
  // rather than trying to provoke the race through a whole render.
  const {readFileSync, readdirSync, statSync} = await import('node:fs');
  const {join} = await import('node:path');
  const {fileURLToPath} = await import('node:url');

  const backend = fileURLToPath(new URL('../packages/backend/src', import.meta.url));
  const sources: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts')) sources.push(path);
    }
  };
  walk(backend);

  const floating: string[] = [];
  for (const path of sources) {
    const lines = readFileSync(path, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (!/\brecordArtifact\(/.test(line)) return;
      // Declarations, and calls whose promise is returned from an arrow or a
      // return statement, are already chained by their caller.
      if (/(?:private |async |=>\s*$|return )/.test(line)) return;
      if (/(?:await|=>|return)\s+\S*recordArtifact\(/.test(line)) return;
      const previous = lines[index - 1] ?? '';
      if (/=>\s*$|return\s*$/.test(previous.trimEnd())) return;
      if (/\brecordArtifact:\s*\(/.test(line)) return;
      floating.push(`${path.slice(backend.length + 1)}:${index + 1}`);
    });
  }

  assert.deepEqual(floating, [], `unawaited artifact writes at ${floating.join(', ')}`);
});
