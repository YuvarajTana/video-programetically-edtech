import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {
  CreateProjectSchema,
  CreateVariantSchema,
  UpdateProjectSchema,
  UpdateTranslationUnitSchema,
  GlossaryEntrySchema,
} from '@video-kit/core/contracts';
import {createSpecFromScript} from '@video-kit/core/storyboard';
import {ingestProjectImage} from '../image-files';
import type {RouteDeps} from './deps';

const IdParams = z.object({id: z.uuid()});

/** Projects, their locale variants, translations, glossary, scripts, and revisions. */
export const projectRoutes = async (app: FastifyInstance, {repository}: RouteDeps) => {
  app.get('/api/projects', async () => await repository.listProjects());

  app.post('/api/projects', async (request, reply) => {
    const project = await repository.createProject(CreateProjectSchema.parse(request.body));
    return reply.status(201).send(project);
  });

  app.get('/api/projects/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    const query = z
      .object({variantId: z.uuid().optional()})
      .parse(request.query);
    return await repository.getProject(id, query.variantId);
  });

  app.put('/api/projects/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.updateProject(id, UpdateProjectSchema.parse(request.body));
  });

  app.get('/api/projects/:id/variants', async (request) => {
    const {id} = IdParams.parse(request.params);
    await repository.getProject(id);
    return await repository.listVariants(id);
  });

  app.post('/api/projects/:id/variants', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const body = CreateVariantSchema.parse(request.body);
    return reply.status(201).send(await repository.createVariant(id, body.locale));
  });

  app.put('/api/projects/:id/variants/:variantId', async (request) => {
    const params = z
      .object({id: z.uuid(), variantId: z.uuid()})
      .parse(request.params);
    const body = z
      .object({
        spec: z.unknown().optional(),
        voiceProfileVersionId: z.uuid().nullable().optional(),
        narrationAssetId: z.uuid().nullable().optional(),
      })
      .parse(request.body);
    return await repository.updateVariant(params.id, params.variantId, body);
  });

  app.post('/api/projects/:id/variants/:variantId/promote', async (request) => {
    const params = z
      .object({id: z.uuid(), variantId: z.uuid()})
      .parse(request.params);
    return await repository.promoteVariant(params.id, params.variantId);
  });

  app.get(
    '/api/projects/:id/variants/:variantId/translations',
    async (request) => {
      const params = z
        .object({id: z.uuid(), variantId: z.uuid()})
        .parse(request.params);
      await repository.getVariant(params.id, params.variantId);
      return await repository.listTranslationUnits(params.variantId);
    },
  );

  app.put(
    '/api/projects/:id/variants/:variantId/translations/:unitId',
    async (request) => {
      const params = z
        .object({id: z.uuid(), variantId: z.uuid(), unitId: z.uuid()})
        .parse(request.params);
      return await repository.updateTranslationUnit(
        params.id,
        params.variantId,
        params.unitId,
        UpdateTranslationUnitSchema.parse(request.body),
      );
    },
  );

  app.post(
    '/api/projects/:id/variants/:variantId/approve',
    async (request) => {
      const params = z
        .object({id: z.uuid(), variantId: z.uuid()})
        .parse(request.params);
      return await repository.approveVariant(params.id, params.variantId);
    },
  );

  app.get('/api/projects/:id/glossary', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.listGlossary(id);
  });

  app.post('/api/projects/:id/glossary', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.upsertGlossary(id, GlossaryEntrySchema.parse(request.body));
  });

  app.delete('/api/projects/:id/glossary/:entryId', async (request) => {
    const params = z
      .object({id: z.uuid(), entryId: z.uuid()})
      .parse(request.params);
    return await repository.deleteGlossary(params.id, params.entryId);
  });

  app.post('/api/projects/:id/import-script', async (request) => {
    const {id} = IdParams.parse(request.params);
    const {script} = z
      .object({script: z.string().max(100_000)})
      .parse(request.body);
    const current = await repository.getProject(id);
    const spec = createSpecFromScript({
      title: current.project.title,
      categoryId: current.category.id,
      template: current.template.definition,
      locale: current.variant.locale,
      deliveries: current.variant.spec.deliveries,
      script,
    });
    return await repository.updateProject(id, {spec});
  });

  app.post('/api/projects/:id/images', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    await repository.getProject(id);
    const upload = await request.file({
      limits: {fileSize: 15 * 1024 * 1024},
    });
    if (!upload) throw new Error('An image file is required.');
    const asset = ingestProjectImage({
      projectId: id,
      originalFilename: upload.filename,
      mimeType: upload.mimetype,
      data: await upload.toBuffer(),
    });
    return reply.status(201).send(asset);
  });

  app.post('/api/projects/:id/revisions', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const {variantId} = z.object({variantId: z.uuid()}).parse(request.body);
    return reply.status(201).send(await repository.createRevision(id, variantId));
  });
};
