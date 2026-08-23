import type {
  CatalogTemplate,
  CatalogTheme,
  CategoryDefinition,
  TemplateDefinition,
  ThemeDefinition,
} from '@video-kit/core/contracts';
import {
  CategoryDefinitionSchema,
  TemplateDefinitionSchema,
  ThemeDefinitionSchema,
} from '@video-kit/core/contracts';
import {now, parse, type DomainContext, type Row} from './context';

/**
 * Themes, templates and categories: the versioned building blocks a project is
 * assembled from. Every edit creates a new version and repoints the active one,
 * so a revision can always resolve the exact definition it was built with.
 */
export const catalogDomain = ({database}: DomainContext) => {
  const domain = {
    listThemes(): CatalogTheme[] {
      return (
        database
          .prepare(
            `SELECT t.id, t.label, v.id AS version_id, v.version, v.definition_json
             FROM themes t
             JOIN theme_versions v ON v.id = t.active_version_id
             ORDER BY t.label`,
          )
          .all() as Row[]
      ).map((row) => ({
        id: String(row.id),
        label: String(row.label),
        versionId: String(row.version_id),
        version: Number(row.version),
        definition: ThemeDefinitionSchema.parse(parse(String(row.definition_json))),
      }));
    },

    listTemplates(): CatalogTemplate[] {
      return (
        database
          .prepare(
            `SELECT t.id, t.label, v.id AS version_id, v.version, v.definition_json
             FROM templates t
             JOIN template_versions v ON v.id = t.active_version_id
             ORDER BY t.label`,
          )
          .all() as Row[]
      ).map((row) => ({
        id: String(row.id),
        label: String(row.label),
        versionId: String(row.version_id),
        version: Number(row.version),
        definition: TemplateDefinitionSchema.parse(
          parse(String(row.definition_json)),
        ),
      }));
    },

    listCategories(): CategoryDefinition[] {
      return (
        database
          .prepare('SELECT definition_json FROM categories ORDER BY id')
          .all() as Row[]
      ).map((row) =>
        CategoryDefinitionSchema.parse(parse(String(row.definition_json))),
      );
    },

    catalog() {
      return {
        categories: domain.listCategories(),
        themes: domain.listThemes(),
        templates: domain.listTemplates(),
      };
    },

    theme(id: string) {
      const theme = domain.listThemes().find((entry) => entry.id === id);
      if (!theme) throw new Error(`Theme "${id}" does not exist.`);
      return theme;
    },

    template(id: string) {
      const template = domain.listTemplates().find((entry) => entry.id === id);
      if (!template) throw new Error(`Template "${id}" does not exist.`);
      return template;
    },

    category(id: string) {
      const category = domain.listCategories().find((entry) => entry.id === id);
      if (!category) throw new Error(`Category "${id}" does not exist.`);
      return category;
    },

    cloneTheme(sourceId: string, id: string, label: string) {
      const source = domain.theme(sourceId);
      const definition = {...source.definition, id};
      const timestamp = now();
      const versionId = `${id}-v1`;
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO themes
              (id, label, active_version_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(id, label, versionId, timestamp, timestamp);
        database
          .prepare(
            `INSERT INTO theme_versions
              (id, theme_id, version, definition_json, created_at)
             VALUES (?, ?, 1, ?, ?)`,
          )
          .run(versionId, id, JSON.stringify(definition), timestamp);
      })();
      return domain.theme(id);
    },

    versionTheme(id: string, definition: ThemeDefinition) {
      const parsed = ThemeDefinitionSchema.parse({...definition, id});
      const next = Number(
        (
          database
            .prepare(
              'SELECT COALESCE(MAX(version), 0) AS value FROM theme_versions WHERE theme_id = ?',
            )
            .get(id) as Row
        ).value,
      ) + 1;
      const versionId = `${id}-v${next}`;
      const timestamp = now();
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO theme_versions
              (id, theme_id, version, definition_json, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(versionId, id, next, JSON.stringify(parsed), timestamp);
        database
          .prepare(
            'UPDATE themes SET active_version_id = ?, updated_at = ? WHERE id = ?',
          )
          .run(versionId, timestamp, id);
      })();
      return domain.theme(id);
    },

    cloneTemplate(sourceId: string, id: string, label: string) {
      const source = domain.template(sourceId);
      const definition = {...source.definition, id, label};
      const timestamp = now();
      const versionId = `${id}-v1`;
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO templates
              (id, label, active_version_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(id, label, versionId, timestamp, timestamp);
        database
          .prepare(
            `INSERT INTO template_versions
              (id, template_id, version, definition_json, created_at)
             VALUES (?, ?, 1, ?, ?)`,
          )
          .run(versionId, id, JSON.stringify(definition), timestamp);
      })();
      return domain.template(id);
    },

    versionTemplate(id: string, definition: TemplateDefinition) {
      const parsed = TemplateDefinitionSchema.parse({...definition, id});
      const next = Number(
        (
          database
            .prepare(
              'SELECT COALESCE(MAX(version), 0) AS value FROM template_versions WHERE template_id = ?',
            )
            .get(id) as Row
        ).value,
      ) + 1;
      const versionId = `${id}-v${next}`;
      const timestamp = now();
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO template_versions
              (id, template_id, version, definition_json, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(versionId, id, next, JSON.stringify(parsed), timestamp);
        database
          .prepare(
            'UPDATE templates SET label = ?, active_version_id = ?, updated_at = ? WHERE id = ?',
          )
          .run(parsed.label, versionId, timestamp, id);
      })();
      return domain.template(id);
    },

    upsertCategory(definition: CategoryDefinition) {
      const parsed = CategoryDefinitionSchema.parse(definition);
      domain.theme(parsed.defaultThemeId);
      domain.template(parsed.defaultTemplateId);
      const timestamp = now();
      database
        .prepare(
          `INSERT INTO categories (id, definition_json, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             definition_json = excluded.definition_json,
             updated_at = excluded.updated_at`,
        )
        .run(parsed.id, JSON.stringify(parsed), timestamp, timestamp);
      return domain.category(parsed.id);
    },
  };

  return domain;
};
