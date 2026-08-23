import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {createSqliteRepository, type Repository} from '@video-kit/datasource';
import {createDatasourceApp} from '@video-kit/datasource/service';
import {createHttpRepository} from '@video-kit/datasource/client';

/**
 * The same assertions run against the store in this process and against the
 * store in another one. Without this, the embedded adapter and the HTTP client
 * drift apart silently and only the running service notices.
 */
const directory = mkdtempSync(join(tmpdir(), 'video-kit-contract-'));
after(() => rmSync(directory, {recursive: true, force: true}));

const embedded = createSqliteRepository({
  databasePath: join(directory, 'embedded.db'),
});

const service = await createDatasourceApp({
  repository: createSqliteRepository({databasePath: join(directory, 'remote.db')}),
});
await service.app.listen({host: '127.0.0.1', port: 0});
const address = service.app.server.address();
const baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
const remote = createHttpRepository(baseUrl);

after(async () => {
  embedded.close();
  await service.app.close();
});

const adapters: [string, Repository][] = [
  ['embedded', embedded],
  ['http', remote],
];

for (const [name, repository] of adapters) {
  test(`${name}: seeds a catalog of themes, templates and categories`, async () => {
    const catalog = await repository.catalog();
    assert.ok(catalog.themes.length > 0, 'no themes seeded');
    assert.ok(catalog.templates.length > 0, 'no templates seeded');
    assert.ok(catalog.categories.length > 0, 'no categories seeded');
  });

  test(`${name}: round-trips a project through create, read and update`, async () => {
    const catalog = await repository.catalog();
    const created = await repository.createProject({
      title: `Contract ${name}`,
      categoryId: catalog.categories[0].id,
      themeId: catalog.themes[0].id,
      templateId: catalog.templates[0].id,
      locale: 'en-US',
      deliveries: ['youtube-long'],
      script: 'A first paragraph.\n\nA second paragraph.',
    });
    // createProject answers with the resolved project, not a bare row.
    assert.ok(created.project.id, 'created project has no id');
    assert.ok(created.variant.spec.scenes.length > 0, 'no scenes derived from the script');

    const listed = await repository.listProjects();
    assert.ok(
      listed.some((project) => project.id === created.project.id),
      'created project is missing from the list',
    );

    await repository.updateProject(created.project.id, {title: 'Renamed'});

    const resolved = await repository.getProject(created.project.id);
    assert.equal(resolved.project.title, 'Renamed');
  });

  test(`${name}: reports a missing project as an error, not an empty result`, async () => {
    // The embedded adapter throws synchronously and the HTTP one rejects, so
    // this has to tolerate both; that difference is exactly what callers see.
    await assert.rejects(
      (async () => repository.getProject('00000000-0000-4000-8000-000000000000'))(),
      /not found|does not exist/i,
    );
  });
}

for (const [name, repository] of adapters) {
  test(`${name}: records and reads back an artifact`, async () => {
    // Methods that delegate to a domain module are own properties rather than
    // prototype methods, which is a different lookup for both the HTTP
    // dispatcher and the client proxy.
    const catalog = await repository.catalog();
    const created = await repository.createProject({
      title: `Artifacts ${name}`,
      categoryId: catalog.categories[0].id,
      themeId: catalog.themes[0].id,
      templateId: catalog.templates[0].id,
      locale: 'en-US',
      deliveries: ['youtube-long'],
      script: 'One paragraph.\n\nTwo paragraph.',
    });
    const job = await repository.createJob(
      created.project.id,
      created.variant.id,
      false,
      {},
    );
    await repository.addArtifact(job.id, {
      kind: 'video',
      deliveryId: 'youtube-long',
      filename: 'out.mp4',
      path: '/tmp/out.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 12,
      checksum: 'abc',
    });
    const listed = await repository.listArtifacts(job.id);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].filename, 'out.mp4');
    assert.equal(await repository.artifactPath(listed[0].id), '/tmp/out.mp4');
  });
}

test('the remote adapter refuses lifecycle methods', async () => {
  assert.throws(() => remote.close(), /not available on a remote datasource/i);
});
