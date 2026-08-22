#!/usr/bin/env node
/**
 * Datasource maintenance.
 *
 *   npm run db:migrate
 *   npm run db:migrate -- --db /path/to/video-kit.db
 *   npm run db:check-specs      report stored specs the schema would reject
 *   npm run db:repair-specs     drop unknown fields and fill empty collections
 *   npm run db:check-editorial  report what the editorial rules say about
 *                               projects that render fine today
 *
 * Migrations used to run implicitly in the repository constructor, which meant
 * every test and every CLI invocation silently migrated whatever database it
 * happened to open. They still do by default for convenience in development;
 * this command is how a service or CI applies them deliberately.
 */
import {config, loadEnv} from '@video-kit/core/config';
import {MIGRATIONS_DIR, StudioRepository} from './sqlite';
import {checkStoredSpecs, repairStoredSpecs} from './sqlite/specs';
import {checkStoredEditorial} from './sqlite/editorial';
import {nodeAssetProbe} from '@video-kit/core/config';

loadEnv();

const argv = process.argv.slice(2);
const command = argv[0] ?? 'migrate';
const flag = (name: string) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : (argv[index + 1] ?? null);
};

const databasePath = flag('db') ?? config.databasePath();
const migrationsDirectory = flag('migrations') ?? MIGRATIONS_DIR;

const COMMANDS = [
  'migrate',
  'status',
  'check-specs',
  'repair-specs',
  'check-editorial',
];
if (!COMMANDS.includes(command)) {
  console.error(`unknown command "${command}" (expected: ${COMMANDS.join(', ')})`);
  process.exit(1);
}

const repository = new StudioRepository({
  databasePath,
  migrationsDirectory,
  autoMigrate: false,
});

/**
 * The read-only commands run with autoMigrate off, so they can be pointed at
 * any database — including one that has never been migrated. Say that plainly
 * instead of failing with "no such table: projects".
 */
const hasSchema = () =>
  Boolean(
    repository.database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
      .get(),
  );

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
} else if (command === 'migrate') {
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
  // An upgrade should say what it broke before the studio does.
  const problems = checkStoredSpecs(repository.database);
  if (problems.length) {
    console.warn(
      `\n! ${problems.length} stored spec(s) no longer parse. ` +
        'Run "npm run db:check-specs" for the detail.',
    );
  }
} else if (command === 'check-specs') {
  if (!hasSchema()) {
    console.log(`no projects table in ${databasePath}; run "npm run db:migrate" first`);
    repository.close();
    process.exit(0);
  }
  const problems = checkStoredSpecs(repository.database);
  if (!problems.length) {
    console.log('✓ every stored spec parses');
  } else {
    console.error(`${problems.length} stored spec(s) would fail to load:\n`);
    for (const problem of problems) {
      console.error(`  ${problem.label}  [${problem.table} ${problem.id}]`);
      for (const issue of problem.issues.slice(0, 6)) {
        console.error(`    ${issue.path}: ${issue.message}`);
      }
      if (problem.issues.length > 6) {
        console.error(`    … and ${problem.issues.length - 6} more`);
      }
    }
    console.error(
      '\nRun "npm run db:repair-specs" to see which of these are stale fields ' +
        'that can be dropped, and which need content edited in the studio.',
    );
    repository.close();
    process.exit(1);
  }
} else if (command === 'check-editorial') {
  if (!hasSchema()) {
    console.log(`no projects table in ${databasePath}; run "npm run db:migrate" first`);
    repository.close();
    process.exit(0);
  }
  const problems = checkStoredEditorial(repository, {assets: nodeAssetProbe()});
  const errors = problems.reduce((sum, problem) => sum + problem.errors.length, 0);
  const warnings = problems.reduce((sum, problem) => sum + problem.warnings.length, 0);
  if (!problems.length) {
    console.log('\u2713 every stored project passes the editorial rules');
  } else {
    for (const problem of problems) {
      console.log(`  ${problem.label}  [${problem.variantId}]`);
      for (const issue of [...problem.errors, ...problem.warnings]) {
        console.log(
          `    ${issue.severity.padEnd(7)} ${issue.path}: ${issue.message}`,
        );
      }
    }
  }
  console.log(
    `\n${problems.length} project variant(s) \u00b7 ${errors} error(s) \u00b7 ${warnings} warning(s)`,
  );
  // Reporting only. Whether an editorial error may fail a production job is
  // decided from this number, not the other way round.
} else if (command === 'repair-specs') {
  const apply = argv.includes('--apply');
  const repairs = repairStoredSpecs(repository.database, {apply});
  if (!repairs.length) {
    console.log('✓ nothing to repair');
  } else {
    console.log(
      apply
        ? `repaired ${repairs.length} spec(s):`
        : `${repairs.length} spec(s) can be repaired — re-run with --apply:`,
    );
    for (const repair of repairs) {
      console.log(`  ${repair.label}  [${repair.id}]`);
      for (const change of repair.changes) console.log(`    ${change}`);
      for (const issue of repair.unrepairable) console.log(`    needs editing — ${issue}`);
    }
    const blocked = repairs.filter((repair) => repair.unrepairable.length);
    if (blocked.length) {
      console.log(
        `\n${blocked.length} spec(s) still need content edited in the studio; ` +
          'nothing can fill those in safely.',
      );
    }
  }
}

repository.close();
