import type DatabaseType from 'better-sqlite3';
import {EditableVideoSpecSchema} from '@video-kit/core/contracts';
import {SCENE_SCHEMAS} from '@video-kit/core/spec';

/**
 * Reading a stored spec.
 *
 * Scene bodies are validated strictly now, which is what stops a malformed
 * scene reaching the renderer — but it also means a row written before that
 * could fail to parse. When it does, the error has to say which project and
 * which scene, and what to run, rather than surfacing a bare ZodError through
 * the API.
 */
export const parseStoredSpec = (json: string, subject: string) => {
  const result = EditableVideoSpecSchema.safeParse(JSON.parse(json));
  if (result.success) return result.data;

  const detail = result.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || 'spec'}: ${issue.message}`)
    .join('; ');
  throw new Error(
    `The stored spec for ${subject} is no longer valid (${detail}). ` +
      'Run "npm run db:check-specs" to see every affected project, or ' +
      '"npm run db:repair-specs" to drop stale fields and list what needs editing.',
  );
};

export type SpecProblem = {
  table: 'project_variants' | 'project_revisions';
  id: string;
  label: string;
  issues: {path: string; message: string}[];
};

const issuesOf = (json: string) => {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    return [{path: 'spec', message: `unreadable JSON: ${String(error)}`}];
  }
  const result = EditableVideoSpecSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.') || 'spec',
    message: issue.message,
  }));
};

/** Every stored spec that would fail to load, with enough detail to fix it. */
export const checkStoredSpecs = (database: DatabaseType.Database): SpecProblem[] => {
  const problems: SpecProblem[] = [];

  const variants = database
    .prepare(
      `SELECT v.id AS id, v.locale AS locale, v.spec_json AS spec_json,
              p.title AS title
         FROM project_variants v
         JOIN projects p ON p.id = v.project_id
        ORDER BY p.title, v.locale`,
    )
    .all() as {id: string; locale: string; spec_json: string; title: string}[];
  for (const row of variants) {
    const issues = issuesOf(row.spec_json);
    if (issues.length) {
      problems.push({
        table: 'project_variants',
        id: row.id,
        label: `${row.title} (${row.locale})`,
        issues,
      });
    }
  }

  const revisions = database
    .prepare('SELECT id, snapshot_json FROM project_revisions ORDER BY created_at')
    .all() as {id: string; snapshot_json: string}[];
  for (const row of revisions) {
    let snapshot: {spec?: unknown} = {};
    try {
      snapshot = JSON.parse(row.snapshot_json) as {spec?: unknown};
    } catch {
      problems.push({
        table: 'project_revisions',
        id: row.id,
        label: `revision ${row.id}`,
        issues: [{path: 'snapshot', message: 'unreadable JSON'}],
      });
      continue;
    }
    const issues = issuesOf(JSON.stringify(snapshot.spec ?? null));
    if (issues.length) {
      problems.push({
        table: 'project_revisions',
        id: row.id,
        label: `revision ${row.id}`,
        issues,
      });
    }
  }

  return problems;
};

export type SpecRepair = {
  table: 'project_variants';
  id: string;
  label: string;
  /** Applied automatically. */
  changes: string[];
  /** Reported only — these need a person to decide what the content should be. */
  unrepairable: string[];
};

/**
 * Bring a stored spec back within the schema.
 *
 * Exactly one thing is safe to do automatically: drop keys the schema does not
 * recognise. Missing content is a judgement call about what the video should
 * say — filling it in would produce a spec that still fails validation while
 * looking repaired — so it is reported for editing instead.
 */
export const repairStoredSpecs = (
  database: DatabaseType.Database,
  {apply}: {apply: boolean},
): SpecRepair[] => {
  const repairs: SpecRepair[] = [];
  const rows = database
    .prepare(
      `SELECT v.id AS id, v.locale AS locale, v.spec_json AS spec_json,
              p.title AS title
         FROM project_variants v
         JOIN projects p ON p.id = v.project_id`,
    )
    .all() as {id: string; locale: string; spec_json: string; title: string}[];

  for (const row of rows) {
    if (!issuesOf(row.spec_json).length) continue;

    let spec: {scenes?: Record<string, unknown>[]};
    try {
      spec = JSON.parse(row.spec_json) as {scenes?: Record<string, unknown>[]};
    } catch {
      continue;
    }
    const changes: string[] = [];
    const unrepairable: string[] = [];

    for (const [index, scene] of (spec.scenes ?? []).entries()) {
      const type = String(scene.type);
      const schema = SCENE_SCHEMAS[type as keyof typeof SCENE_SCHEMAS];
      if (!schema) {
        changes.push(`scene[${index}]: unknown type "${type}", left alone`);
        continue;
      }
      const allowed = new Set(Object.keys(schema.shape));
      for (const key of Object.keys(scene)) {
        if (allowed.has(key)) continue;
        delete scene[key];
        changes.push(`scene[${index}] (${type}): dropped unknown field "${key}"`);
      }
      const result = schema.safeParse(scene);
      if (result.success) continue;
      for (const issue of result.error.issues) {
        unrepairable.push(
          `scene[${index}] (${type}): ${issue.path.join('.') || 'spec'} — ${issue.message}`,
        );
      }
    }

    if (!changes.length && !unrepairable.length) continue;
    repairs.push({
      table: 'project_variants',
      id: row.id,
      label: `${row.title} (${row.locale})`,
      changes,
      unrepairable,
    });
    if (apply) {
      database
        .prepare('UPDATE project_variants SET spec_json = ? WHERE id = ?')
        .run(JSON.stringify(spec), row.id);
    }
  }

  return repairs;
};
