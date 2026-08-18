#!/usr/bin/env node

import Database from 'better-sqlite3';
import {existsSync, mkdirSync, rmSync} from 'node:fs';
import {dirname, resolve, sep} from 'node:path';

const storageRoot = resolve('.video-kit');
const databasePath = resolve(storageRoot, 'video-kit.db');
const voicesRoot = resolve(storageRoot, 'voices');
const voiceCacheRoot = resolve(storageRoot, 'cache', 'voice');
const importedReferenceRoot = resolve(storageRoot, 'reference-import');
const narrationsRoot = resolve(storageRoot, 'narrations');
const removeAllNarrations = process.argv.includes('--all-narrations');
const narrationWhere = removeAllNarrations ? '' : "WHERE usage = 'reference'";

const assertInside = (path, root) => {
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    throw new Error(`Refusing to remove path outside ${root}: ${path}`);
  }
};

if (!existsSync(databasePath)) {
  throw new Error(`Studio database not found: ${databasePath}`);
}

const database = new Database(databasePath);
database.pragma('foreign_keys = ON');

const profiles = Number(
  database.prepare('SELECT COUNT(*) AS value FROM voice_profiles').get().value,
);
const samples = Number(
  database.prepare('SELECT COUNT(*) AS value FROM voice_samples').get().value,
);
const removedNarrations = database
  .prepare(`SELECT id, path FROM uploaded_narrations ${narrationWhere}`)
  .all();

database.transaction(() => {
  database.prepare('UPDATE project_variants SET voice_profile_version_id = NULL').run();
  database
    .prepare(
      `UPDATE project_variants SET narration_asset_id = NULL
       WHERE narration_asset_id IN (
         SELECT id FROM uploaded_narrations ${narrationWhere}
       )`,
    )
    .run();
  database.prepare(`DELETE FROM uploaded_narrations ${narrationWhere}`).run();
  database.prepare('DELETE FROM voice_profiles').run();
})();

database.pragma('wal_checkpoint(TRUNCATE)');
database.close();

for (const narration of removedNarrations) {
  const path = resolve(String(narration.path));
  assertInside(path, narrationsRoot);
  if (existsSync(path)) rmSync(path, {force: true});
}

for (const path of [voicesRoot, voiceCacheRoot, importedReferenceRoot]) {
  assertInside(path, storageRoot);
  if (existsSync(path)) rmSync(path, {recursive: true, force: true});
}

mkdirSync(voicesRoot, {recursive: true, mode: 0o700});
mkdirSync(dirname(voiceCacheRoot), {recursive: true, mode: 0o700});

console.log(
  JSON.stringify(
    {
      deletedProfiles: profiles,
      deletedSamples: samples,
      deletedNarrationAssets: removedNarrations.length,
      completedVideosPreserved: true,
      installedModelsPreserved: true,
    },
    null,
    2,
  ),
);
