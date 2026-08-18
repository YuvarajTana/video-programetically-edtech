#!/usr/bin/env node
/**
 * Datasource maintenance.
 *
 *   npm run migrate -w @video-kit/datasource
 *   npm run migrate -w @video-kit/datasource -- --db /path/to/video-kit.db
 *
 * Migrations used to run implicitly in the repository constructor, which meant
 * every test and every CLI invocation silently migrated whatever database it
 * happened to open. They still do by default for convenience in development;
 * this command is how a service or CI applies them deliberately.
 */
import {config, loadEnv} from '@video-kit/core/config';
import {MIGRATIONS_DIR, StudioRepository} from './sqlite';

loadEnv();

const argv = process.argv.slice(2);
const command = argv[0] ?? 'migrate';
const flag = (name: string) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : (argv[index + 1] ?? null);
};

const databasePath = flag('db') ?? config.databasePath();
const migrationsDirectory = flag('migrations') ?? MIGRATIONS_DIR;

if (!['migrate', 'status'].includes(command)) {
  console.error(`unknown command "${command}" (expected: migrate, status)`);
  process.exit(1);
}

const repository = new StudioRepository({
  databasePath,
  migrationsDirectory,
  autoMigrate: false,
});

const applied = () =>
  repository.database
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map((row) => (row as {version: string}).version);

if (command === 'status') {
  console.log(`database   ${databasePath}`);
  console.log(`migrations ${migrationsDirectory}`);
  const versions = repository.database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
    .get()
    ? applied()
    : [];
  console.log(versions.length ? versions.map((v) => `  ✓ ${v}`).join('\n') : '  (none applied)');
} else {
  const before = new Set(
    repository.database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
      .get()
      ? applied()
      : [],
  );
  repository.applyMigrations();
  const after = applied();
  const fresh = after.filter((version) => !before.has(version));
  console.log(
    fresh.length
      ? `applied ${fresh.length} migration(s):\n${fresh.map((v) => `  + ${v}`).join('\n')}`
      : 'already up to date',
  );
}

repository.close();
