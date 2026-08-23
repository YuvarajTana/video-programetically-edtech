import {parseStoredSpec} from './specs';
import {artifactsDomain} from './domains/artifacts';
import {catalogDomain} from './domains/catalog';
import Database from 'better-sqlite3';
import {createHash, randomUUID} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {
  CategoryDefinitionSchema,
  CreateVoiceProfileSchema,
  EditableVideoSpecSchema,
  GlossaryEntrySchema,
  TemplateDefinitionSchema,
  ThemeDefinitionSchema,
  type ArtifactRecord,
  type CatalogTemplate,
  type CatalogTheme,
  type CategoryDefinition,
  type CreateProjectInput,
  type EditableVideoSpec,
  type JobDetail,
  type JobRecord,
  type JobStage,
  type JobStatus,
  type GlossaryEntryRecord,
  type NarrationAssetRecord,
  type ProjectRecord,
  type RenderSnapshot,
  type ResolvedProject,
  type TemplateDefinition,
  type ThemeDefinition,
  type VariantRecord,
  type TranslationUnitRecord,
  type VoiceProfileRecord,
  type VoiceProfileVersionRecord,
  type VoiceProvider,
  type VoiceSampleRecord,
} from '@video-kit/core/contracts';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TEMPLATES,
  DEFAULT_THEMES,
} from '@video-kit/core/defaults';
import {config} from '@video-kit/core/config';
import {fileURLToPath} from 'node:url';
import {createSpecFromScript, slugify} from '@video-kit/core/storyboard';
import {
  extractTranslatableFields,
  setFieldAtPath,
  sourceTextHash,
} from '@video-kit/core/localization';
import {SupportedLocaleSchema} from '@video-kit/core/languages';
import type {ChannelProfile} from '@video-kit/core/channels';
import type {VideoSpec} from '@video-kit/core/spec';

type Catalog = ReturnType<typeof catalogDomain>;

const now = () => new Date().toISOString();
const parse = <T>(value: string) => JSON.parse(value) as T;

type Row = Record<string, unknown>;

/** Migrations ship with this package, so they are found wherever it is installed. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

export type SqliteRepositoryOptions = {
  databasePath?: string;
  migrationsDirectory?: string;
  /**
   * Apply pending migrations and seed on construction. Left on so local dev and
   * tests need no extra step; the service and CI use the explicit migrate CLI.
   */
  autoMigrate?: boolean;
};

export class StudioRepository {
  readonly database: Database.Database;
  readonly storageRoot: string;
  private readonly migrationsDirectory: string;
  private readonly artifacts: ReturnType<typeof artifactsDomain>;
  private readonly catalogDomain: Catalog;

  constructor(options: string | SqliteRepositoryOptions = {}) {
    const {
      databasePath = config.databasePath(),
      migrationsDirectory = MIGRATIONS_DIR,
      autoMigrate = true,
    } = typeof options === 'string' ? {databasePath: options} : options;

    this.migrationsDirectory = migrationsDirectory;
    this.storageRoot = dirname(databasePath);
    mkdirSync(dirname(databasePath), {recursive: true});
    this.database = new Database(databasePath);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('foreign_keys = ON');

    const domain = {
      database: this.database,
      storageRoot: this.storageRoot,
      repository: this,
    };
    this.artifacts = artifactsDomain(domain);
    this.catalogDomain = catalogDomain(domain);

    if (autoMigrate) {
      this.migrate();
      this.seed();
      // Only meaningful once the schema exists; the migrate CLI opens an
      // unmigrated database and must not trip over a missing jobs table.
      this.recoverInterruptedJobs();
    }
  }

  /** Apply pending migrations and seed defaults. Used by the migrate CLI. */
  applyMigrations() {
    this.migrate();
    this.seed();
  }

  close() {
    this.database.close();
  }

  private migrate() {
    this.database.exec(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
    );
    const directory = this.migrationsDirectory;
    for (const filename of readdirSync(directory)
      .filter((entry) => entry.endsWith('.sql'))
      .sort()) {
      const exists = this.database
        .prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
        .get(filename);
      if (exists) continue;
      const sql = readFileSync(join(directory, filename), 'utf8');
      this.database.transaction(() => {
        this.database.exec(sql);
        this.database
          .prepare(
            'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          )
          .run(filename, now());
      })();
    }
  }

  private seed() {
    const timestamp = now();
    this.database.transaction(() => {
      for (const definition of DEFAULT_THEMES) {
        const versionId = `${definition.id}-v1`;
        this.database
          .prepare(
            `INSERT OR IGNORE INTO themes
              (id, label, active_version_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            definition.id,
            `${definition.id[0].toUpperCase()}${definition.id.slice(1)} theme`,
            versionId,
            timestamp,
            timestamp,
          );
        this.database
          .prepare(
            `INSERT OR IGNORE INTO theme_versions
              (id, theme_id, version, definition_json, created_at)
             VALUES (?, ?, 1, ?, ?)`,
          )
          .run(versionId, definition.id, JSON.stringify(definition), timestamp);
      }
      for (const definition of DEFAULT_TEMPLATES) {
        const versionId = `${definition.id}-v1`;
        this.database
          .prepare(
            `INSERT OR IGNORE INTO templates
              (id, label, active_version_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            definition.id,
            definition.label,
            versionId,
            timestamp,
            timestamp,
          );
        this.database
          .prepare(
            `INSERT OR IGNORE INTO template_versions
              (id, template_id, version, definition_json, created_at)
             VALUES (?, ?, 1, ?, ?)`,
          )
          .run(versionId, definition.id, JSON.stringify(definition), timestamp);
      }
      for (const definition of DEFAULT_CATEGORIES) {
        this.database
          .prepare(
            `INSERT OR IGNORE INTO categories
              (id, definition_json, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
          )
          .run(
            definition.id,
            JSON.stringify(definition),
            timestamp,
            timestamp,
          );
      }
    })();
  }

  private recoverInterruptedJobs() {
    const timestamp = now();
    this.database
      .prepare(
        `UPDATE jobs
         SET status = 'interrupted', error = ?, updated_at = ?, completed_at = ?
         WHERE status = 'running'`,
      )
      .run('The studio stopped while this job was running. Retry it safely.', timestamp, timestamp);
  }

  listThemes: Catalog['listThemes'] = (...args) => this.catalogDomain.listThemes(...args);

  listTemplates: Catalog['listTemplates'] = (...args) =>
    this.catalogDomain.listTemplates(...args);

  listCategories: Catalog['listCategories'] = (...args) =>
    this.catalogDomain.listCategories(...args);

  catalog: Catalog['catalog'] = (...args) => this.catalogDomain.catalog(...args);

  cloneTheme: Catalog['cloneTheme'] = (...args) =>
    this.catalogDomain.cloneTheme(...args);

  versionTheme: Catalog['versionTheme'] = (...args) =>
    this.catalogDomain.versionTheme(...args);

  cloneTemplate: Catalog['cloneTemplate'] = (...args) =>
    this.catalogDomain.cloneTemplate(...args);

  versionTemplate: Catalog['versionTemplate'] = (...args) =>
    this.catalogDomain.versionTemplate(...args);

  upsertCategory: Catalog['upsertCategory'] = (...args) =>
    this.catalogDomain.upsertCategory(...args);

  /** Projects legitimately depend on the catalog, so these stay reachable. */
  private theme(id: string) {
    return this.catalogDomain.theme(id);
  }

  private template(id: string) {
    return this.catalogDomain.template(id);
  }

  private category(id: string) {
    return this.catalogDomain.category(id);
  }

  listProjects(): ProjectRecord[] {
    return (
      this.database
        .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
        .all() as Row[]
    ).map(this.mapProject);
  }

  createProject(input: CreateProjectInput) {
    const category = this.category(input.categoryId);
    const template = this.template(input.templateId);
    this.theme(input.themeId);
    const id = randomUUID();
    const variantId = randomUUID();
    const timestamp = now();
    const spec = createSpecFromScript({
      title: input.title,
      categoryId: input.categoryId,
      template: template.definition,
      locale: input.locale,
      deliveries: input.deliveries,
      script: input.script,
      targetSeconds: input.targetSeconds,
      editorial: {
        ageBand: input.ageBand,
        objective: input.objective,
        safetyStatus: input.safetyStatus,
      },
    });
    const slug = slugify(input.title);
    this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO projects
            (id, title, slug, status, category_id, template_id, theme_id,
             default_locale, created_at, updated_at)
           VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.title,
          slug,
          category.id,
          template.id,
          input.themeId,
          input.locale,
          timestamp,
          timestamp,
        );
      this.database
        .prepare(
          `INSERT INTO project_variants
            (id, project_id, locale, spec_json, translation_status,
             approved_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'approved', ?, ?, ?)`,
        )
        .run(
          variantId,
          id,
          input.locale,
          JSON.stringify(spec),
          timestamp,
          timestamp,
          timestamp,
        );
      this.database
        .prepare('UPDATE projects SET master_variant_id = ? WHERE id = ?')
        .run(variantId, id);
    })();
    return this.getProject(id);
  }

  cloneLegacy(spec: VideoSpec) {
    const id = randomUUID();
    const variantId = randomUUID();
    const timestamp = now();
    const locale = spec.editorial?.language ?? 'en-US';
    const category = this.category(spec.channel);
    const templateId = this.listTemplates().some((entry) => entry.id === spec.template)
      ? spec.template
      : category.defaultTemplateId;
    const parsed = EditableVideoSpecSchema.parse({
      ...spec,
      template: templateId,
      fps: spec.fps ?? 30,
      deliveries: spec.deliveries ?? category.defaultDeliveries,
      captions: spec.captions ?? true,
      editorial: {...spec.editorial, language: locale},
    });
    this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO projects
            (id, title, slug, status, category_id, template_id, theme_id,
             default_locale, created_at, updated_at)
           VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          `${spec.title} (copy)`,
          `${spec.slug}-copy`,
          spec.channel,
          templateId,
          category.defaultThemeId,
          locale,
          timestamp,
          timestamp,
        );
      this.database
        .prepare(
          `INSERT INTO project_variants
            (id, project_id, locale, spec_json, translation_status,
             approved_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'approved', ?, ?, ?)`,
        )
        .run(
          variantId,
          id,
          locale,
          JSON.stringify({...parsed, title: `${spec.title} (copy)`}),
          timestamp,
          timestamp,
          timestamp,
        );
      this.database
        .prepare('UPDATE projects SET master_variant_id = ? WHERE id = ?')
        .run(variantId, id);
    })();
    return this.getProject(id);
  }

  listVariants(projectId: string): VariantRecord[] {
    return (
      this.database
        .prepare(
          `SELECT * FROM project_variants
           WHERE project_id = ?
           ORDER BY created_at ASC`,
        )
        .all(projectId) as Row[]
    ).map(this.mapVariant);
  }

  getVariant(projectId: string, variantId: string): VariantRecord {
    const row = this.database
      .prepare(
        'SELECT * FROM project_variants WHERE project_id = ? AND id = ?',
      )
      .get(projectId, variantId) as Row | undefined;
    if (!row) throw new Error('Variant not found.');
    return this.mapVariant(row);
  }

  getProject(id: string, variantId?: string): ResolvedProject {
    const row = this.database
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Project not found.');
    const project = this.mapProject(row);
    const variants = this.listVariants(id);
    const variant =
      variants.find(
        (entry) =>
          entry.id ===
          (variantId ?? project.masterVariantId ?? variants[0]?.id),
      ) ?? variants[0];
    if (!variant) throw new Error('Project variant not found.');
    const category = this.category(project.categoryId);
    const theme = this.theme(project.themeId);
    const template = this.template(project.templateId);
    const channel: ChannelProfile = {
      id: category.id,
      label: category.label,
      shortLabel: category.shortLabel,
      handle: category.handle,
      theme: theme.definition,
      defaultDeliveries: category.defaultDeliveries,
      defaultTemplate: category.defaultTemplateId,
      defaultCta: category.defaultCta,
      defaultHashtags: category.defaultHashtags,
      voice: category.voice,
      editorial: category.editorial,
    };
    return {project, variant, variants, category, theme, template, channel};
  }

  updateProject(
    id: string,
    changes: {
      title?: string;
      locale?: string;
      spec?: unknown;
      themeId?: string;
      templateId?: string;
    },
  ) {
    const current = this.getProject(id);
    const spec = changes.spec
      ? EditableVideoSpecSchema.parse(changes.spec)
      : current.variant.spec;
    if (changes.themeId) this.theme(changes.themeId);
    if (changes.templateId) this.template(changes.templateId);
    const timestamp = now();
    const title = changes.title ?? spec.title ?? current.project.title;
    this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE projects SET
             title = ?, slug = ?, theme_id = ?, template_id = ?,
             default_locale = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          title,
          slugify(title),
          changes.themeId ?? current.project.themeId,
          changes.templateId ?? current.project.templateId,
          changes.locale ?? current.variant.locale,
          timestamp,
          id,
        );
      this.database
        .prepare(
          `UPDATE project_variants
           SET locale = ?, spec_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          changes.locale ?? current.variant.locale,
          JSON.stringify({...spec, title, slug: slugify(title)}),
          timestamp,
          current.variant.id,
        );
      if (changes.spec && current.project.masterVariantId === current.variant.id) {
        this.markDependentTranslationsStale(
          current,
          spec,
          timestamp,
        );
      }
    })();
    return this.getProject(id);
  }

  updateVariant(
    projectId: string,
    variantId: string,
    changes: {
      spec?: unknown;
      voiceProfileVersionId?: string | null;
      narrationAssetId?: string | null;
    },
  ) {
    const current = this.getProject(projectId, variantId);
    const spec = changes.spec
      ? EditableVideoSpecSchema.parse(changes.spec)
      : current.variant.spec;
    if (changes.voiceProfileVersionId) {
      this.getVoiceProfileVersion(changes.voiceProfileVersionId);
    }
    if (changes.narrationAssetId) {
      this.getNarrationAsset(changes.narrationAssetId);
    }
    const timestamp = now();
    this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE project_variants
           SET spec_json = ?, voice_profile_version_id = ?,
               narration_asset_id = ?, updated_at = ?
           WHERE id = ? AND project_id = ?`,
        )
        .run(
          JSON.stringify(spec),
          changes.voiceProfileVersionId === undefined
            ? current.variant.voiceProfileVersionId
            : changes.voiceProfileVersionId,
          changes.narrationAssetId === undefined
            ? current.variant.narrationAssetId
            : changes.narrationAssetId,
          timestamp,
          variantId,
          projectId,
        );
      if (current.project.masterVariantId === variantId) {
        const fields = new Map(
          extractTranslatableFields(spec).map((field) => [
            `${field.sceneId}:${field.fieldPath}`,
            sourceTextHash(field.sourceText),
          ]),
        );
        for (const target of current.variants.filter(
          (entry) => entry.sourceVariantId === variantId,
        )) {
          const units = this.listTranslationUnits(target.id);
          let stale = false;
          for (const unit of units) {
            const latest = fields.get(`${unit.sceneId}:${unit.fieldPath}`);
            if (!latest || latest !== unit.sourceHash) {
              stale = true;
              this.database
                .prepare(
                  `UPDATE translation_units
                   SET status = 'stale', updated_at = ?
                   WHERE id = ?`,
                )
                .run(timestamp, unit.id);
            }
          }
          if (stale) {
            this.database
              .prepare(
                `UPDATE project_variants
                 SET translation_status = 'stale', approved_at = NULL,
                     updated_at = ?
                 WHERE id = ?`,
              )
              .run(timestamp, target.id);
          }
        }
      }
      this.database
        .prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
        .run(timestamp, projectId);
    })();
    return this.getProject(projectId, variantId);
  }

  createVariant(projectId: string, locale: string) {
    const targetLocale = SupportedLocaleSchema.parse(locale);
    const resolved = this.getProject(projectId);
    if (resolved.variants.some((entry) => entry.locale === targetLocale)) {
      throw new Error(`A ${targetLocale} variant already exists.`);
    }
    const master =
      resolved.variants.find(
        (entry) => entry.id === resolved.project.masterVariantId,
      ) ?? resolved.variant;
    const id = randomUUID();
    const timestamp = now();
    const spec = structuredClone(master.spec);
    spec.editorial = {...spec.editorial, language: targetLocale};
    const fields = extractTranslatableFields(master.spec);
    const revisionHash = this.variantSourceHash(master.spec);
    this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO project_variants
            (id, project_id, locale, spec_json, source_variant_id,
             translation_status, source_revision_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
        )
        .run(
          id,
          projectId,
          targetLocale,
          JSON.stringify(spec),
          master.id,
          revisionHash,
          timestamp,
          timestamp,
        );
      const insert = this.database.prepare(
        `INSERT INTO translation_units
          (id, variant_id, scene_id, field_path, source_text, source_hash,
           translated_text, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      );
      for (const field of fields) {
        insert.run(
          randomUUID(),
          id,
          field.sceneId,
          field.fieldPath,
          field.sourceText,
          sourceTextHash(field.sourceText),
          field.sourceText,
          timestamp,
          timestamp,
        );
      }
      this.database
        .prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
        .run(timestamp, projectId);
    })();
    return this.getProject(projectId, id);
  }

  promoteVariant(projectId: string, variantId: string) {
    const selected = this.getVariant(projectId, variantId);
    const timestamp = now();
    this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE projects
           SET master_variant_id = ?, default_locale = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(variantId, selected.locale, timestamp, projectId);
      this.database
        .prepare(
          `UPDATE project_variants
           SET source_variant_id = NULL, translation_status = 'approved',
               approved_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, timestamp, variantId);
      this.database
        .prepare(
          `UPDATE project_variants
           SET source_variant_id = ?, translation_status = 'stale',
               approved_at = NULL, updated_at = ?
           WHERE project_id = ? AND id <> ?`,
        )
        .run(variantId, timestamp, projectId, variantId);
      this.database
        .prepare(
          `UPDATE translation_units SET status = 'stale', updated_at = ?
           WHERE variant_id IN (
             SELECT id FROM project_variants
             WHERE project_id = ? AND id <> ?
           )`,
        )
        .run(timestamp, projectId, variantId);
    })();
    return this.getProject(projectId, variantId);
  }

  listTranslationUnits(variantId: string): TranslationUnitRecord[] {
    return (
      this.database
        .prepare(
          `SELECT * FROM translation_units
           WHERE variant_id = ?
           ORDER BY created_at, scene_id, field_path`,
        )
        .all(variantId) as Row[]
    ).map((row) => ({
      id: String(row.id),
      variantId: String(row.variant_id),
      sceneId: String(row.scene_id),
      fieldPath: String(row.field_path),
      sourceText: String(row.source_text),
      sourceHash: String(row.source_hash),
      pivotText: row.pivot_text ? String(row.pivot_text) : null,
      translatedText: String(row.translated_text),
      status: String(row.status) as TranslationUnitRecord['status'],
      reviewerNote: row.reviewer_note ? String(row.reviewer_note) : null,
      approvedAt: row.approved_at ? String(row.approved_at) : null,
      updatedAt: String(row.updated_at),
    }));
  }

  applyTranslationResults(
    projectId: string,
    variantId: string,
    results: Array<{
      unitId: string;
      translatedText: string;
      pivotText?: string | null;
    }>,
  ) {
    this.getVariant(projectId, variantId);
    const timestamp = now();
    this.database.transaction(() => {
      const update = this.database.prepare(
        `UPDATE translation_units
         SET translated_text = ?, pivot_text = ?, status = 'draft',
             approved_at = NULL, updated_at = ?
         WHERE id = ? AND variant_id = ?`,
      );
      for (const result of results) {
        update.run(
          result.translatedText,
          result.pivotText ?? null,
          timestamp,
          result.unitId,
          variantId,
        );
      }
      this.database
        .prepare(
          `UPDATE project_variants
           SET translation_status = 'in_review', approved_at = NULL,
               updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, variantId);
      this.rebuildVariantSpec(variantId);
    })();
    return {
      project: this.getProject(projectId, variantId),
      units: this.listTranslationUnits(variantId),
    };
  }

  updateTranslationUnit(
    projectId: string,
    variantId: string,
    unitId: string,
    changes: {
      translatedText?: string;
      reviewerNote?: string | null;
      status?: 'draft' | 'approved' | 'stale';
    },
  ) {
    this.getVariant(projectId, variantId);
    const row = this.database
      .prepare(
        'SELECT * FROM translation_units WHERE id = ? AND variant_id = ?',
      )
      .get(unitId, variantId) as Row | undefined;
    if (!row) throw new Error('Translation unit not found.');
    const timestamp = now();
    this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE translation_units SET
             translated_text = ?, reviewer_note = ?, status = ?,
             approved_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          changes.translatedText ?? String(row.translated_text),
          changes.reviewerNote === undefined
            ? row.reviewer_note
            : changes.reviewerNote,
          changes.status ?? String(row.status),
          changes.status === 'approved'
            ? timestamp
            : changes.status
              ? null
              : row.approved_at,
          timestamp,
          unitId,
        );
      this.rebuildVariantSpec(variantId);
      this.refreshVariantApproval(variantId, timestamp);
    })();
    return {
      project: this.getProject(projectId, variantId),
      units: this.listTranslationUnits(variantId),
    };
  }

  approveVariant(projectId: string, variantId: string) {
    const variant = this.getVariant(projectId, variantId);
    if (!variant.sourceVariantId) return this.getProject(projectId, variantId);
    const units = this.listTranslationUnits(variantId);
    if (!units.length) throw new Error('No translation units were found.');
    if (units.some((unit) => !unit.translatedText.trim())) {
      throw new Error('Every translation field needs text before approval.');
    }
    const timestamp = now();
    this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE translation_units
           SET status = 'approved', approved_at = ?, updated_at = ?
           WHERE variant_id = ?`,
        )
        .run(timestamp, timestamp, variantId);
      this.database
        .prepare(
          `UPDATE project_variants
           SET translation_status = 'approved', approved_at = ?,
               updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, timestamp, variantId);
      this.rebuildVariantSpec(variantId);
    })();
    return this.getProject(projectId, variantId);
  }

  listGlossary(projectId: string): GlossaryEntryRecord[] {
    return (
      this.database
        .prepare(
          'SELECT * FROM project_glossary WHERE project_id = ? ORDER BY source_term',
        )
        .all(projectId) as Row[]
    ).map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      sourceTerm: String(row.source_term),
      translatedTerm: row.translated_term
        ? String(row.translated_term)
        : null,
      mode: String(row.mode) as GlossaryEntryRecord['mode'],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  upsertGlossary(
    projectId: string,
    input: {
      sourceTerm: string;
      translatedTerm?: string | null;
      mode?: 'preserve' | 'translate';
    },
  ) {
    this.getProject(projectId);
    const parsed = GlossaryEntrySchema.parse(input);
    const timestamp = now();
    this.database
      .prepare(
        `INSERT INTO project_glossary
          (id, project_id, source_term, translated_term, mode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, source_term) DO UPDATE SET
           translated_term = excluded.translated_term,
           mode = excluded.mode,
           updated_at = excluded.updated_at`,
      )
      .run(
        randomUUID(),
        projectId,
        parsed.sourceTerm,
        parsed.translatedTerm ?? null,
        parsed.mode,
        timestamp,
        timestamp,
      );
    return this.listGlossary(projectId);
  }

  deleteGlossary(projectId: string, id: string) {
    const result = this.database
      .prepare('DELETE FROM project_glossary WHERE project_id = ? AND id = ?')
      .run(projectId, id);
    if (!result.changes) throw new Error('Glossary entry not found.');
    return this.listGlossary(projectId);
  }

  createVoiceProfile(input: unknown): VoiceProfileRecord {
    const parsed = CreateVoiceProfileSchema.parse(input);
    const id = randomUUID();
    const consentId = randomUUID();
    const versionId = randomUUID();
    const timestamp = now();
    this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO voice_profiles
            (id, name, owner_name, status, active_version_id, created_at, updated_at)
           VALUES (?, ?, ?, 'draft', ?, ?, ?)`,
        )
        .run(
          id,
          parsed.name,
          parsed.ownerName,
          versionId,
          timestamp,
          timestamp,
        );
      this.database
        .prepare(
          `INSERT INTO voice_consents
            (id, profile_id, version, phrase_text, adult_attested,
             ownership_attested, consented_at)
           VALUES (?, ?, 1, ?, 1, 1, ?)`,
        )
        .run(consentId, id, parsed.consentPhrase, timestamp);
      this.database
        .prepare(
          `INSERT INTO voice_profile_versions
            (id, profile_id, version, provider, model, consent_id,
             enabled_locales_json, cloud_allowed_at, created_at)
           VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          versionId,
          id,
          parsed.provider,
          parsed.model,
          consentId,
          JSON.stringify(parsed.enabledLocales),
          parsed.cloudAllowed ? timestamp : null,
          timestamp,
        );
      const preview = this.database.prepare(
        `INSERT INTO voice_locale_previews
          (id, version_id, locale, status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
      );
      for (const locale of parsed.enabledLocales) {
        preview.run(randomUUID(), versionId, locale, timestamp, timestamp);
      }
    })();
    mkdirSync(join(this.storageRoot, 'voices', id), {
      recursive: true,
      mode: 0o700,
    });
    return this.getVoiceProfile(id);
  }

  listVoiceProfiles(): VoiceProfileRecord[] {
    return (
      this.database
        .prepare('SELECT id FROM voice_profiles ORDER BY updated_at DESC')
        .all() as Row[]
    ).map((row) => this.getVoiceProfile(String(row.id)));
  }

  getVoiceProfile(id: string): VoiceProfileRecord {
    const row = this.database
      .prepare('SELECT * FROM voice_profiles WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Voice profile not found.');
    return {
      id: String(row.id),
      name: String(row.name),
      ownerName: String(row.owner_name),
      status: String(row.status) as VoiceProfileRecord['status'],
      activeVersionId: row.active_version_id
        ? String(row.active_version_id)
        : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      revokedAt: row.revoked_at ? String(row.revoked_at) : null,
      activeVersion: row.active_version_id
        ? this.getVoiceProfileVersion(String(row.active_version_id))
        : null,
    };
  }

  getVoiceProfileVersion(id: string): VoiceProfileVersionRecord {
    const row = this.database
      .prepare('SELECT * FROM voice_profile_versions WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Voice profile version not found.');
    return {
      id: String(row.id),
      profileId: String(row.profile_id),
      version: Number(row.version),
      provider: String(row.provider) as VoiceProvider,
      model: String(row.model),
      primarySampleId: row.primary_sample_id
        ? String(row.primary_sample_id)
        : null,
      consentId: String(row.consent_id),
      enabledLocales: parse<string[]>(String(row.enabled_locales_json)),
      cloudAllowedAt: row.cloud_allowed_at
        ? String(row.cloud_allowed_at)
        : null,
      createdAt: String(row.created_at),
    };
  }

  addVoiceSample({
    profileId,
    purpose,
    locale,
    transcript,
    path,
    mimeType,
    checksum,
    sizeBytes,
    durationSeconds,
    issues,
  }: {
    profileId: string;
    purpose: 'consent' | 'reference';
    locale: string;
    transcript: string;
    path: string;
    mimeType: string;
    checksum: string;
    sizeBytes: number;
    durationSeconds: number | null;
    issues: string[];
  }): VoiceSampleRecord {
    const profile = this.getVoiceProfile(profileId);
    if (profile.status === 'revoked') throw new Error('Voice profile is revoked.');
    const id = randomUUID();
    const timestamp = now();
    const quality = {
      valid: issues.length === 0,
      issues,
      sizeBytes,
    };
    this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO voice_samples
            (id, profile_id, purpose, locale, transcript, path, mime_type,
             duration_seconds, checksum, quality_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          profileId,
          purpose,
          locale,
          transcript,
          path,
          mimeType,
          durationSeconds,
          checksum,
          JSON.stringify(quality),
          timestamp,
        );
      if (purpose === 'consent' && quality.valid) {
        this.database
          .prepare(
            `UPDATE voice_consents
             SET recording_path = ?, recording_checksum = ?
             WHERE id = ?`,
          )
          .run(path, checksum, profile.activeVersion?.consentId);
      } else if (quality.valid) {
        this.database
          .prepare(
            `UPDATE voice_profile_versions SET primary_sample_id = ?
             WHERE id = ?`,
          )
          .run(id, profile.activeVersionId);
        this.database
          .prepare(
            `UPDATE voice_locale_previews
             SET status = 'pending', artifact_path = NULL, accepted_at = NULL,
                 updated_at = ?
             WHERE version_id = ?`,
          )
          .run(timestamp, profile.activeVersionId);
        this.database
          .prepare(
            `UPDATE voice_profiles
             SET status = 'draft', updated_at = ?
             WHERE id = ?`,
          )
          .run(timestamp, profileId);
      }
      this.database
        .prepare('UPDATE voice_profiles SET updated_at = ? WHERE id = ?')
        .run(timestamp, profileId);
    })();
    return this.getVoiceSample(id);
  }

  listVoiceSamples(profileId: string): VoiceSampleRecord[] {
    this.getVoiceProfile(profileId);
    return (
      this.database
        .prepare(
          'SELECT id FROM voice_samples WHERE profile_id = ? ORDER BY created_at',
        )
        .all(profileId) as Row[]
    ).map((row) => this.getVoiceSample(String(row.id)));
  }

  getVoiceSample(id: string): VoiceSampleRecord {
    const row = this.database
      .prepare('SELECT * FROM voice_samples WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Voice sample not found.');
    return {
      id: String(row.id),
      profileId: String(row.profile_id),
      purpose: String(row.purpose) as VoiceSampleRecord['purpose'],
      locale: String(row.locale),
      transcript: String(row.transcript),
      mimeType: String(row.mime_type),
      durationSeconds:
        row.duration_seconds === null ? null : Number(row.duration_seconds),
      checksum: String(row.checksum),
      quality: parse<VoiceSampleRecord['quality']>(String(row.quality_json)),
      createdAt: String(row.created_at),
    };
  }

  addNarrationAsset(input: {
    label: string;
    locale: string;
    originalFilename: string;
    path: string;
    mimeType: string;
    durationSeconds: number;
    checksum: string;
    sizeBytes: number;
    usage?: 'reference' | 'finished';
  }): NarrationAssetRecord {
    const id = randomUUID();
    const timestamp = now();
    this.database
      .prepare(
        `INSERT INTO uploaded_narrations
          (id, label, locale, original_filename, path, mime_type,
           duration_seconds, checksum, size_bytes, usage, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.label,
        input.locale,
        input.originalFilename,
        input.path,
        input.mimeType,
        input.durationSeconds,
        input.checksum,
        input.sizeBytes,
        input.usage ?? 'finished',
        timestamp,
      );
    return this.getNarrationAsset(id);
  }

  listNarrationAssets(): NarrationAssetRecord[] {
    return (
      this.database
        .prepare('SELECT id FROM uploaded_narrations ORDER BY created_at DESC')
        .all() as Row[]
    ).map((row) => this.getNarrationAsset(String(row.id)));
  }

  getNarrationAsset(id: string): NarrationAssetRecord {
    const row = this.database
      .prepare('SELECT * FROM uploaded_narrations WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Uploaded narration not found.');
    return {
      id: String(row.id),
      label: String(row.label),
      locale: String(row.locale),
      originalFilename: String(row.original_filename),
      mimeType: String(row.mime_type),
      durationSeconds: Number(row.duration_seconds),
      checksum: String(row.checksum),
      sizeBytes: Number(row.size_bytes),
      usage: String(row.usage ?? 'reference') as NarrationAssetRecord['usage'],
      createdAt: String(row.created_at),
    };
  }

  narrationAssetPath(id: string) {
    const row = this.database
      .prepare('SELECT path FROM uploaded_narrations WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Uploaded narration not found.');
    return String(row.path);
  }

  voiceSamplePath(id: string) {
    const row = this.database
      .prepare('SELECT path FROM voice_samples WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Voice sample not found.');
    return String(row.path);
  }

  acceptVoicePreview(profileId: string, locale: string) {
    const profile = this.getVoiceProfile(profileId);
    if (!profile.activeVersionId) throw new Error('Voice profile has no version.');
    SupportedLocaleSchema.parse(locale);
    const timestamp = now();
    const result = this.database
      .prepare(
        `UPDATE voice_locale_previews
         SET status = 'accepted', accepted_at = ?, updated_at = ?
         WHERE version_id = ? AND locale = ?`,
      )
      .run(timestamp, timestamp, profile.activeVersionId, locale);
    if (!result.changes) throw new Error('Voice locale preview not found.');
    const pending = Number(
      (
        this.database
          .prepare(
            `SELECT COUNT(*) AS value FROM voice_locale_previews
             WHERE version_id = ? AND status <> 'accepted'`,
          )
          .get(profile.activeVersionId) as Row
      ).value,
    );
    const version = this.getVoiceProfileVersion(profile.activeVersionId);
    const hasConsent = Boolean(
      (
        this.database
          .prepare(
            'SELECT recording_checksum FROM voice_consents WHERE id = ?',
          )
          .get(version.consentId) as Row | undefined
      )?.recording_checksum,
    );
    if (pending === 0 && hasConsent && version.primarySampleId) {
      this.database
        .prepare(
          `UPDATE voice_profiles SET status = 'ready', updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, profileId);
    }
    return this.getVoiceProfile(profileId);
  }

  voiceProfileForPreview(profileId: string, locale: string) {
    const profile = this.getVoiceProfile(profileId);
    if (profile.status === 'revoked') throw new Error('Voice profile is revoked.');
    if (!profile.activeVersionId || !profile.activeVersion) {
      throw new Error('Voice profile has no active version.');
    }
    if (!profile.activeVersion.enabledLocales.includes(locale)) {
      throw new Error(`Voice profile is not configured for ${locale}.`);
    }
    if (!profile.activeVersion.primarySampleId) {
      throw new Error('Upload a valid reference recording first.');
    }
    return {
      profile,
      version: profile.activeVersion,
      sample: this.getVoiceSample(profile.activeVersion.primarySampleId),
      samplePath: this.voiceSamplePath(profile.activeVersion.primarySampleId),
    };
  }

  markVoicePreview(profileId: string, locale: string, path: string) {
    const profile = this.getVoiceProfile(profileId);
    if (!profile.activeVersionId) throw new Error('Voice profile has no version.');
    const timestamp = now();
    const result = this.database
      .prepare(
        `UPDATE voice_locale_previews
         SET status = 'ready', artifact_path = ?, accepted_at = NULL,
             updated_at = ?
         WHERE version_id = ? AND locale = ?`,
      )
      .run(path, timestamp, profile.activeVersionId, locale);
    if (!result.changes) throw new Error('Voice locale preview not found.');
    return {profileId, locale, status: 'ready' as const};
  }

  listVoicePreviews(profileId: string) {
    const profile = this.getVoiceProfile(profileId);
    if (!profile.activeVersionId) return [];
    return (
      this.database
        .prepare(
          `SELECT locale, status, artifact_path, accepted_at, updated_at
           FROM voice_locale_previews
           WHERE version_id = ?
           ORDER BY locale`,
        )
        .all(profile.activeVersionId) as Row[]
    ).map((row) => ({
      locale: String(row.locale),
      status: String(row.status) as 'pending' | 'ready' | 'accepted',
      hasAudio: Boolean(row.artifact_path),
      acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
      updatedAt: String(row.updated_at),
    }));
  }

  voicePreviewPath(profileId: string, locale: string) {
    const profile = this.getVoiceProfile(profileId);
    if (!profile.activeVersionId) throw new Error('Voice profile has no version.');
    const row = this.database
      .prepare(
        `SELECT artifact_path FROM voice_locale_previews
         WHERE version_id = ? AND locale = ?`,
      )
      .get(profile.activeVersionId, locale) as Row | undefined;
    if (!row?.artifact_path) throw new Error('Voice preview not found.');
    return String(row.artifact_path);
  }

  revokeVoiceProfile(id: string) {
    const profile = this.getVoiceProfile(id);
    if (profile.status === 'revoked') return profile;
    const timestamp = now();
    this.database
      .prepare(
        `UPDATE voice_profiles
         SET status = 'revoked', revoked_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(timestamp, timestamp, id);
    const cache = join(this.storageRoot, 'cache', 'voice', id);
    if (existsSync(cache)) rmSync(cache, {recursive: true, force: true});
    return this.getVoiceProfile(id);
  }

  deleteVoiceProfile(id: string) {
    this.getVoiceProfile(id);
    const activeUse = Number(
      (
        this.database
          .prepare(
            `SELECT COUNT(*) AS value FROM project_variants
             WHERE voice_profile_version_id IN (
               SELECT id FROM voice_profile_versions WHERE profile_id = ?
             )`,
          )
          .get(id) as Row
      ).value,
    );
    if (activeUse) {
      throw new Error(
        'Voice profile is still assigned to a project variant. Reassign it first.',
      );
    }
    this.database
      .prepare('DELETE FROM voice_profiles WHERE id = ?')
      .run(id);
    const directory = join(this.storageRoot, 'voices', id);
    if (existsSync(directory)) rmSync(directory, {recursive: true, force: true});
    return {deleted: true};
  }

  voiceProfileForProduction(versionId: string, locale: string) {
    const version = this.getVoiceProfileVersion(versionId);
    const profile = this.getVoiceProfile(version.profileId);
    if (profile.status !== 'ready') {
      throw new Error('Voice profile must be ready before production.');
    }
    if (!version.enabledLocales.includes(locale)) {
      throw new Error(`Voice profile is not enabled for ${locale}.`);
    }
    if (!version.primarySampleId) {
      throw new Error('Voice profile has no validated reference sample.');
    }
    return {
      profile,
      version,
      sample: this.getVoiceSample(version.primarySampleId),
      samplePath: this.voiceSamplePath(version.primarySampleId),
    };
  }

  private variantSourceHash(spec: EditableVideoSpec) {
    return createHash('sha256')
      .update(JSON.stringify(extractTranslatableFields(spec)))
      .digest('hex');
  }

  private rebuildVariantSpec(variantId: string) {
    const row = this.database
      .prepare('SELECT spec_json FROM project_variants WHERE id = ?')
      .get(variantId) as Row | undefined;
    if (!row) throw new Error('Variant not found.');
    const spec = parseStoredSpec(String(row.spec_json), `variant ${variantId}`);
    const scenes = new Map(
      spec.scenes.map((scene, index) => [
        scene.id ?? `scene-${index + 1}`,
        scene as unknown as Record<string, unknown>,
      ]),
    );
    for (const unit of this.listTranslationUnits(variantId)) {
      const scene = scenes.get(unit.sceneId);
      if (scene) setFieldAtPath(scene, unit.fieldPath, unit.translatedText);
    }
    this.database
      .prepare('UPDATE project_variants SET spec_json = ? WHERE id = ?')
      .run(JSON.stringify(spec), variantId);
  }

  private refreshVariantApproval(variantId: string, timestamp: string) {
    const units = this.listTranslationUnits(variantId);
    const approved =
      units.length > 0 && units.every((unit) => unit.status === 'approved');
    this.database
      .prepare(
        `UPDATE project_variants
         SET translation_status = ?, approved_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        approved ? 'approved' : 'in_review',
        approved ? timestamp : null,
        timestamp,
        variantId,
      );
  }

  private markDependentTranslationsStale(
    resolved: ResolvedProject,
    spec: EditableVideoSpec,
    timestamp: string,
  ) {
    const fields = new Map(
      extractTranslatableFields(spec).map((field) => [
        `${field.sceneId}:${field.fieldPath}`,
        sourceTextHash(field.sourceText),
      ]),
    );
    for (const target of resolved.variants.filter(
      (entry) => entry.sourceVariantId === resolved.variant.id,
    )) {
      let stale = false;
      for (const unit of this.listTranslationUnits(target.id)) {
        const latest = fields.get(`${unit.sceneId}:${unit.fieldPath}`);
        if (!latest || latest !== unit.sourceHash) {
          stale = true;
          this.database
            .prepare(
              `UPDATE translation_units
               SET status = 'stale', updated_at = ?
               WHERE id = ?`,
            )
            .run(timestamp, unit.id);
        }
      }
      if (stale) {
        this.database
          .prepare(
            `UPDATE project_variants
             SET translation_status = 'stale', approved_at = NULL,
                 updated_at = ?
             WHERE id = ?`,
          )
          .run(timestamp, target.id);
      }
    }
  }

  createRevision(projectId: string, variantId: string) {
    const resolved = this.getProject(projectId, variantId);
    if (
      resolved.variant.id !== resolved.project.masterVariantId &&
      resolved.variant.translationStatus !== 'approved'
    ) {
      throw new Error(
        'Translation approval is required before creating a production revision.',
      );
    }
    const revisionNumber =
      Number(
        (
          this.database
            .prepare(
              `SELECT COALESCE(MAX(revision_number), 0) AS value
               FROM project_revisions WHERE project_id = ? AND variant_id = ?`,
            )
            .get(projectId, variantId) as Row
        ).value,
      ) + 1;
    const id = randomUUID();
    const timestamp = now();
    const snapshot: RenderSnapshot = {
      schemaVersion: 1,
      project: resolved.project,
      variant: resolved.variant,
      spec: resolved.variant.spec as VideoSpec,
      channel: resolved.channel,
      themeVersionId: resolved.theme.versionId,
      templateVersionId: resolved.template.versionId,
      createdAt: timestamp,
    };
    this.database
      .prepare(
        `INSERT INTO project_revisions
          (id, project_id, variant_id, revision_number, snapshot_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        projectId,
        variantId,
        revisionNumber,
        JSON.stringify(snapshot),
        timestamp,
      );
    return {id, revisionNumber, snapshot};
  }

  getRevision(id: string): RenderSnapshot {
    const row = this.database
      .prepare('SELECT snapshot_json FROM project_revisions WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Revision not found.');
    return parse<RenderSnapshot>(String(row.snapshot_json));
  }

  createJob(
    projectId: string,
    variantId: string,
    generateVoice: boolean,
    options: {
      provider?: VoiceProvider;
      voiceProfileVersionId?: string;
      cloudConfirmed?: boolean;
    } = {},
  ) {
    const variant = this.getVariant(projectId, variantId);
    const assignedVoiceVersion = variant.voiceProfileVersionId
      ? this.getVoiceProfileVersion(variant.voiceProfileVersionId)
      : null;
    const provider = generateVoice
      ? options.provider ??
        assignedVoiceVersion?.provider ??
        (variant.locale === 'en-US' ? 'kokoro' : null)
      : null;
    const voiceVersionId =
      options.voiceProfileVersionId ?? variant.voiceProfileVersionId;
    if (
      generateVoice &&
      (provider === 'f5tts' ||
        provider === 'indicf5' ||
        provider === 'elevenlabs')
    ) {
      throw new Error(
        'Cloned voice production is disabled. Use local Studio TTS or upload a complete narration track.',
      );
    }
    if (generateVoice && provider === 'chatterbox') {
      if (!voiceVersionId) {
        throw new Error('Select a ready My Voice profile.');
      }
      const selected = this.voiceProfileForProduction(
        voiceVersionId,
        variant.locale,
      );
      if (selected.version.provider !== 'chatterbox') {
        throw new Error('The selected voice profile is not a local My Voice profile.');
      }
    }
    if (generateVoice && provider === 'uploaded') {
      if (!variant.narrationAssetId) {
        throw new Error('Select an uploaded narration track.');
      }
      const narration = this.getNarrationAsset(variant.narrationAssetId);
      if (narration.locale !== variant.locale) {
        throw new Error('The uploaded narration language does not match the video.');
      }
    }
    if (
      voiceVersionId &&
      voiceVersionId !== variant.voiceProfileVersionId
    ) {
      this.updateVariant(projectId, variantId, {
        voiceProfileVersionId: voiceVersionId,
      });
    }
    const revision = this.createRevision(projectId, variantId);
    const id = randomUUID();
    const timestamp = now();
    this.database
      .prepare(
        `INSERT INTO jobs
          (id, project_id, variant_id, revision_id, status, stage, progress,
           generate_voice, kind, provider, cloud_confirmed, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'queued', 'queued', 0, ?, 'production', ?, ?, ?, ?)`,
      )
      .run(
        id,
        projectId,
        variantId,
        revision.id,
        generateVoice ? 1 : 0,
        provider,
        options.cloudConfirmed ? 1 : 0,
        timestamp,
        timestamp,
      );
    this.addJobEvent(id, 'queued', 'info', 'Job queued.', 0);
    return this.getJob(id);
  }

  createTranslationJob(projectId: string, variantId: string) {
    const target = this.getVariant(projectId, variantId);
    if (!target.sourceVariantId) {
      throw new Error('The master variant does not require translation.');
    }
    const revision = this.createRevision(projectId, target.sourceVariantId);
    const id = randomUUID();
    const timestamp = now();
    this.database
      .prepare(
        `INSERT INTO jobs
          (id, project_id, variant_id, revision_id, status, stage, progress,
           generate_voice, kind, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'queued', 'queued', 0, 0, 'translation', ?, ?)`,
      )
      .run(
        id,
        projectId,
        variantId,
        revision.id,
        timestamp,
        timestamp,
      );
    this.addJobEvent(id, 'queued', 'info', 'Translation job queued.', 0);
    return this.getJob(id);
  }

  retryJob(id: string) {
    const previous = this.getJob(id);
    if (!['failed', 'cancelled', 'interrupted'].includes(previous.status)) {
      throw new Error('Only failed, cancelled, or interrupted jobs can be retried.');
    }
    return previous.kind === 'translation'
      ? this.createTranslationJob(previous.projectId, previous.variantId)
      : this.createJob(
          previous.projectId,
          previous.variantId,
          previous.generateVoice,
          {
            provider: previous.provider ?? undefined,
            cloudConfirmed: previous.cloudConfirmed,
          },
        );
  }

  listJobs(): JobRecord[] {
    return (
      this.database
        .prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100')
        .all() as Row[]
    ).map(this.mapJob);
  }

  getJob(id: string): JobRecord {
    const row = this.database.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as
      | Row
      | undefined;
    if (!row) throw new Error('Job not found.');
    return this.mapJob(row);
  }

  getJobDetail(id: string): JobDetail {
    const job = this.getJob(id);
    const events = (
      this.database
        .prepare('SELECT * FROM job_events WHERE job_id = ? ORDER BY id')
        .all(id) as Row[]
    ).map((row) => ({
      id: Number(row.id),
      stage: String(row.stage) as JobStage,
      level: String(row.level) as 'info' | 'warn' | 'error',
      message: String(row.message),
      progress: Number(row.progress),
      createdAt: String(row.created_at),
    }));
    return {...job, events, artifacts: this.listArtifacts(id)};
  }

  updateJob(
    id: string,
    values: Partial<{
      status: JobStatus;
      stage: JobStage;
      progress: number;
      error: string | null;
      startedAt: string;
      completedAt: string;
    }>,
  ) {
    const current = this.getJob(id);
    const updatedAt = now();
    this.database
      .prepare(
        `UPDATE jobs SET
           status = ?, stage = ?, progress = ?, error = ?,
           started_at = ?, completed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        values.status ?? current.status,
        values.stage ?? current.stage,
        values.progress ?? current.progress,
        values.error === undefined ? current.error : values.error,
        values.startedAt ?? current.startedAt,
        values.completedAt ?? current.completedAt,
        updatedAt,
        id,
      );
    return this.getJob(id);
  }

  addJobEvent(
    id: string,
    stage: JobStage,
    level: 'info' | 'warn' | 'error',
    message: string,
    progress: number,
  ) {
    this.database
      .prepare(
        `INSERT INTO job_events
          (job_id, stage, level, message, progress, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, stage, level, message.slice(0, 2_000), progress, now());
  }

  // Artifacts, revisions, jobs, voices and the catalog live in ./domains; the
  // methods stay flat here because the port is derived from this class and the
  // HTTP transport dispatches by method name.
  addArtifact: ReturnType<typeof artifactsDomain>['addArtifact'] = (...args) =>
    this.artifacts.addArtifact(...args);

  listArtifacts: ReturnType<typeof artifactsDomain>['listArtifacts'] = (...args) =>
    this.artifacts.listArtifacts(...args);

  artifactPath: ReturnType<typeof artifactsDomain>['artifactPath'] = (...args) =>
    this.artifacts.artifactPath(...args);

  private mapProject = (row: Row): ProjectRecord => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    status: String(row.status) as ProjectRecord['status'],
    categoryId: String(row.category_id),
    templateId: String(row.template_id),
    themeId: String(row.theme_id),
    defaultLocale: String(row.default_locale),
    masterVariantId: row.master_variant_id
      ? String(row.master_variant_id)
      : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });

  private mapVariant = (row: Row): VariantRecord => ({
    id: String(row.id),
    projectId: String(row.project_id),
    locale: String(row.locale),
    spec: parseStoredSpec(String(row.spec_json), `variant ${String(row.id)}`),
    sourceVariantId: row.source_variant_id
      ? String(row.source_variant_id)
      : null,
    translationStatus: String(
      row.translation_status ?? 'approved',
    ) as VariantRecord['translationStatus'],
    sourceRevisionHash: row.source_revision_hash
      ? String(row.source_revision_hash)
      : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    voiceProfileVersionId: row.voice_profile_version_id
      ? String(row.voice_profile_version_id)
      : null,
    narrationAssetId: row.narration_asset_id
      ? String(row.narration_asset_id)
      : null,
    updatedAt: String(row.updated_at),
  });

  private mapJob = (row: Row): JobRecord => ({
    id: String(row.id),
    projectId: String(row.project_id),
    variantId: String(row.variant_id),
    revisionId: String(row.revision_id),
    status: String(row.status) as JobStatus,
    stage: String(row.stage) as JobStage,
    progress: Number(row.progress),
    generateVoice: Boolean(row.generate_voice),
    kind: String(row.kind ?? 'production') as JobRecord['kind'],
    provider: row.provider
      ? (String(row.provider) as JobRecord['provider'])
      : null,
    cloudConfirmed: Boolean(row.cloud_confirmed),
    error: row.error ? String(row.error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
  });
}
