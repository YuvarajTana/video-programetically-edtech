import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {
  CategoryDefinitionSchema,
  IdentifierSchema,
  TemplateDefinitionSchema,
  ThemeDefinitionSchema,
} from '@video-kit/core/contracts';
import type {RouteDeps} from './deps';

const NamedIdParams = z.object({id: IdentifierSchema});

/** Themes, templates, and categories: the reusable pieces a project is built from. */
export const libraryRoutes = async (app: FastifyInstance, {repository}: RouteDeps) => {
  app.post('/api/themes/clone', async (request) => {
    const body = z
      .object({
        sourceId: IdentifierSchema,
        id: IdentifierSchema,
        label: z.string().trim().min(1).max(100),
      })
      .parse(request.body);
    return await repository.cloneTheme(body.sourceId, body.id, body.label);
  });

  app.put('/api/themes/:id', async (request) => {
    const {id} = NamedIdParams.parse(request.params);
    const definition = ThemeDefinitionSchema.parse(request.body);
    return await repository.versionTheme(id, definition);
  });

  app.post('/api/templates/clone', async (request) => {
    const body = z
      .object({
        sourceId: IdentifierSchema,
        id: IdentifierSchema,
        label: z.string().trim().min(1).max(100),
      })
      .parse(request.body);
    return await repository.cloneTemplate(body.sourceId, body.id, body.label);
  });

  app.put('/api/templates/:id', async (request) => {
    const {id} = NamedIdParams.parse(request.params);
    const definition = TemplateDefinitionSchema.parse(request.body);
    return await repository.versionTemplate(id, definition);
  });

  app.post('/api/categories', async (request) =>
    await repository.upsertCategory(CategoryDefinitionSchema.parse(request.body)),
  );

  app.put('/api/categories/:id', async (request) => {
    const {id} = NamedIdParams.parse(request.params);
    return await repository.upsertCategory(
      CategoryDefinitionSchema.parse({
        ...(request.body as Record<string, unknown>),
        id,
      }),
    );
  });
};
