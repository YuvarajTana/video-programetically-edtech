import {paths} from '@video-kit/core/config';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import Fastify from 'fastify';
import {createReadStream, existsSync, mkdirSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {z, ZodError} from 'zod';
import {
  CategoryDefinitionSchema,
  CreateJobSchema,
  CreateProjectSchema,
  ScriptGenerationInputSchema,
  CreateVariantSchema,
  CreateVoiceProfileSchema,
  GlossaryEntrySchema,
  IdentifierSchema,
  TemplateDefinitionSchema,
  ThemeDefinitionSchema,
  UpdateTranslationUnitSchema,
  UpdateProjectSchema,
} from '@video-kit/core/contracts';
import {LANGUAGES, SupportedLocaleSchema} from '@video-kit/core/languages';
import {MUSIC_TRACKS, musicTrackById} from '@video-kit/core/music';
import {createSpecFromScript, slugify} from '@video-kit/core/storyboard';
import {VIDEOS} from '@video-kit/catalog';
import {createRepository, type Repository} from '@video-kit/datasource';
import {JobRunner} from './pipeline';
import {LocalAiWorker} from './local-ai';
import {ChatterboxVoiceWorker} from './local-voice';
import {ingestVoiceSample} from './voice-files';
import {ingestNarrationAsset} from './narration-files';
import {ingestProjectImage} from './image-files';
import {ElevenLabsVoiceProvider} from './elevenlabs';
import {
  OpenAiScriptGenerator,
  type ScriptGenerator,
} from './openai-script';

const IdParams = z.object({id: z.uuid()});
const NamedIdParams = z.object({id: IdentifierSchema});

export const createStudioApp = async ({
  repository: providedRepository,
  ai = new LocalAiWorker(),
  cloudVoice = new ElevenLabsVoiceProvider(),
  localVoice = new ChatterboxVoiceWorker(),
  scriptGenerator = new OpenAiScriptGenerator(),
}: {
  repository?: Repository;
  ai?: LocalAiWorker;
  cloudVoice?: ElevenLabsVoiceProvider;
  localVoice?: ChatterboxVoiceWorker;
  scriptGenerator?: ScriptGenerator;
} = {}) => {
  // Resolved here rather than in the parameter list: which store this is —
  // SQLite in this process, or a datasource service over HTTP — is decided by
  // configuration, and awaiting is not allowed in a default initializer.
  const repository = providedRepository ?? (await createRepository());

  const app = Fastify({
    logger: true,
    bodyLimit: 1_000_000,
  });
  await app.register(fastifyMultipart, {
    limits: {files: 1, fileSize: 384 * 1024 * 1024, fields: 8},
  });
  const runner = new JobRunner(repository, ai, cloudVoice, localVoice);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation failed.',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    const notFound = /not found|does not exist/i.test(message);
    const conflict = /UNIQUE constraint|already/i.test(message);
    return reply
      .status(notFound ? 404 : conflict ? 409 : 400)
      .send({error: message.replaceAll(process.cwd(), '<project>')});
  });

  app.get('/api/health', async () => ({
    ok: true,
    service: 'video-kit-studio',
    time: new Date().toISOString(),
  }));

  app.get('/api/catalog', async () => await repository.catalog());

  app.get('/api/languages', async () => ({
    languages: LANGUAGES,
    models: [...ai.modelStatus(), localVoice.modelStatus()],
  }));

  app.get('/api/music', async () => MUSIC_TRACKS);

  app.get('/api/music/:id/audio', async (request, reply) => {
    const {id} = NamedIdParams.parse(request.params);
    const track = musicTrackById(id);
    if (!track) throw new Error('Music track not found.');
    const path = resolve('public', track.src);
    const musicRoot = resolve('public', 'audio', 'music');
    if (!path.startsWith(`${musicRoot}${sep}`) || !existsSync(path)) {
      throw new Error('Music track not found.');
    }
    reply.type(track.src.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg');
    reply.header('Cache-Control', 'private, max-age=3600');
    return reply.send(createReadStream(path));
  });

  app.get('/api/script-generation/status', async () =>
    scriptGenerator.status(),
  );

  app.post('/api/script-generation/generate', async (request) => {
    const input = ScriptGenerationInputSchema.parse(request.body);
    const catalog = await repository.catalog();
    const category = catalog.categories.find(
      (item) => item.id === input.categoryId,
    );
    const template = catalog.templates.find(
      (item) => item.id === input.templateId,
    );
    if (!category) throw new Error(`Category ${input.categoryId} not found.`);
    if (!template) throw new Error(`Template ${input.templateId} not found.`);
    return scriptGenerator.generate(input, {
      category,
      template: template.definition,
    });
  });

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

  app.get('/api/legacy-videos', async () =>
    VIDEOS.map((spec) => ({
      ref: `${spec.channel}/${spec.slug}`,
      title: spec.title,
      categoryId: spec.channel,
      durationSeconds:
        spec.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) /
        (spec.fps ?? 30),
      scenes: spec.scenes.length,
      spec,
    })),
  );

  app.post('/api/legacy-videos/:channel/:slug/clone', async (request, reply) => {
    const params = z
      .object({channel: IdentifierSchema, slug: IdentifierSchema})
      .parse(request.params);
    const spec = VIDEOS.find(
      (video) =>
        video.channel === params.channel && video.slug === params.slug,
    );
    if (!spec) throw new Error('Legacy video not found.');
    return reply.status(201).send(await repository.cloneLegacy(spec));
  });

  app.get('/api/jobs', async () => await repository.listJobs());

  app.post('/api/jobs', async (request, reply) => {
    const body = CreateJobSchema.parse(request.body);
    if (body.kind === 'voice-validation') {
      throw new Error(
        'Voice validation starts from the voice profile preview endpoint.',
      );
    }
    const job =
      body.kind === 'translation'
        ? await repository.createTranslationJob(body.projectId, body.variantId)
        : await repository.createJob(
            body.projectId,
            body.variantId,
            body.generateVoice,
            {
              provider: body.provider,
              voiceProfileVersionId: body.voiceProfileVersionId,
              cloudConfirmed: body.cloudConfirmed,
            },
          );
    runner.enqueue();
    return reply.status(202).send(job);
  });

  app.get('/api/voices', async () => await repository.listVoiceProfiles());

  app.get('/api/narrations', async () => await repository.listNarrationAssets());

  app.post('/api/narrations', async (request, reply) => {
    const upload = await request.file({
      limits: {fileSize: 384 * 1024 * 1024},
    });
    if (!upload) throw new Error('An audio file is required.');
    const field = (name: string) => {
      const value = upload.fields[name];
      if (!value || Array.isArray(value) || value.type !== 'field') {
        throw new Error(`Missing multipart field "${name}".`);
      }
      return String(value.value);
    };
    const label = z.string().trim().min(1).max(120).parse(field('label'));
    const locale = SupportedLocaleSchema.parse(field('locale'));
    const narration = ingestNarrationAsset({
      repository,
      label,
      locale,
      originalFilename: upload.filename,
      mimeType: upload.mimetype,
      data: await upload.toBuffer(),
    });
    return reply.status(201).send(narration);
  });

  app.get('/api/narrations/:id/audio', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const narration = await repository.getNarrationAsset(id);
    const path = resolve(await repository.narrationAssetPath(id));
    const root = resolve(paths.managed(), 'narrations');
    if (!path.startsWith(`${root}${sep}`) || !existsSync(path)) {
      throw new Error('Uploaded narration not found.');
    }
    reply.type(narration.mimeType);
    reply.header('Cache-Control', 'private, no-store');
    return reply.send(createReadStream(path));
  });

  app.post('/api/voices', async (request, reply) => {
    const body = CreateVoiceProfileSchema.parse(request.body);
    if (body.provider !== 'chatterbox') {
      throw new Error(
        'Only the local My Voice engine is enabled for new voice profiles.',
      );
    }
    if (body.enabledLocales.some((locale) => locale !== 'en-US')) {
      throw new Error('The local My Voice engine currently supports English only.');
    }
    return reply.status(201).send(await repository.createVoiceProfile(body));
  });

  app.get('/api/voices/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    return {
      profile: await repository.getVoiceProfile(id),
      samples: await repository.listVoiceSamples(id),
      previews: await repository.listVoicePreviews(id),
    };
  });

  app.post('/api/voices/:id/samples', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const upload = await request.file({
      limits: {fileSize: 12 * 1024 * 1024},
    });
    if (!upload) throw new Error('An audio file is required.');
    const field = (name: string) => {
      const value = upload.fields[name];
      if (!value || Array.isArray(value) || value.type !== 'field') {
        throw new Error(`Missing multipart field "${name}".`);
      }
      return String(value.value);
    };
    const purpose = z.enum(['consent', 'reference']).parse(field('purpose'));
    const locale = SupportedLocaleSchema.parse(field('locale'));
    const transcript = z
      .string()
      .trim()
      .min(1)
      .max(8_000)
      .parse(field('transcript'));
    const sample = ingestVoiceSample({
      repository,
      profileId: id,
      purpose,
      locale,
      transcript,
      mimeType: upload.mimetype,
      data: await upload.toBuffer(),
    });
    return reply.status(201).send(sample);
  });

  app.get('/api/voice-samples/:id/audio', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const sample = await repository.getVoiceSample(id);
    const path = resolve(await repository.voiceSamplePath(id));
    const voiceRoot = resolve(paths.managed(), 'voices');
    if (!path.startsWith(`${voiceRoot}${sep}`) || !existsSync(path)) {
      throw new Error('Voice sample not found.');
    }
    reply.type(sample.mimeType);
    reply.header('Cache-Control', 'private, no-store');
    return reply.send(createReadStream(path));
  });

  app.post(
    '/api/voices/:id/previews/:locale',
    async (request) => {
      const params = z
        .object({id: z.uuid(), locale: SupportedLocaleSchema})
        .parse(request.params);
      const selected = await repository.voiceProfileForPreview(
        params.id,
        params.locale,
      );
      const language = LANGUAGES.find(
        (item) => item.locale === params.locale,
      )!;
      const previewText: Record<string, string> = {
        'en-US': 'This is a private preview of my synthetic voice.',
        'hi-IN': 'यह मेरी कृत्रिम आवाज़ का निजी नमूना है।',
        'ta-IN': 'இது எனது செயற்கைக் குரலின் தனிப்பட்ட முன்னோட்டம்.',
        'te-IN': 'ఇది నా కృత్రిమ స్వరానికి చెందిన ప్రైవేట్ నమూనా.',
        'kn-IN': 'ಇದು ನನ್ನ ಕೃತಕ ಧ್ವನಿಯ ಖಾಸಗಿ ಮುನ್ನೋಟ.',
        'ml-IN': 'ഇത് എന്റെ കൃത്രിമ ശബ്ദത്തിന്റെ സ്വകാര്യ മാതൃകയാണ്.',
        'bn-IN': 'এটি আমার কৃত্রিম কণ্ঠের ব্যক্তিগত নমুনা।',
      };
      const directory = resolve(
        paths.managed(),
        'voices',
        params.id,
        'previews',
      );
      mkdirSync(directory, {recursive: true, mode: 0o700});
      const outputPath = join(directory, `${params.locale}.wav`);
      if (selected.version.provider === 'chatterbox') {
        if (params.locale !== 'en-US') {
          throw new Error('The local My Voice engine currently supports English only.');
        }
        await localVoice.synthesize({
          text: previewText[params.locale],
          referencePath: selected.samplePath,
          outputPath,
        });
      } else if (selected.version.provider === 'elevenlabs') {
        if (!selected.version.cloudAllowedAt) {
          throw new Error(
            'This voice profile does not permit cloud voice uploads.',
          );
        }
        await cloudVoice.synthesize({
          text: previewText[params.locale],
          voiceId: selected.version.model,
          outputPath,
          speed: 1,
        });
      } else {
        await ai.synthesize({
          text: previewText[params.locale],
          locale: params.locale,
          referencePath: selected.samplePath,
          referenceTranscript: selected.sample.transcript,
          outputPath,
          speed: 1,
          engine:
            selected.version.provider === 'f5tts' && params.locale === 'en-US'
              ? 'f5tts'
              : 'indicf5',
        });
      }
      await repository.markVoicePreview(params.id, params.locale, outputPath);
      return {
        profileId: params.id,
        locale: params.locale,
        language: language.label,
        audioUrl: `/api/voices/${params.id}/previews/${params.locale}/audio`,
      };
    },
  );

  app.get(
    '/api/voices/:id/previews/:locale/audio',
    async (request, reply) => {
      const params = z
        .object({id: z.uuid(), locale: SupportedLocaleSchema})
        .parse(request.params);
      const path = resolve(
        await repository.voicePreviewPath(params.id, params.locale),
      );
      const root = resolve(paths.managed(), 'voices', params.id);
      if (!path.startsWith(`${root}${sep}`) || !existsSync(path)) {
        throw new Error('Voice preview not found.');
      }
      reply.type('audio/wav');
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(createReadStream(path));
    },
  );

  app.post(
    '/api/voices/:id/previews/:locale/accept',
    async (request) => {
      const params = z
        .object({id: z.uuid(), locale: SupportedLocaleSchema})
        .parse(request.params);
      return await repository.acceptVoicePreview(params.id, params.locale);
    },
  );

  app.post('/api/voices/:id/revoke', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.revokeVoiceProfile(id);
  });

  app.delete('/api/voices/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.deleteVoiceProfile(id);
  });

  app.get('/api/jobs/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.getJobDetail(id);
  });

  app.post('/api/jobs/:id/cancel', async (request) => {
    const {id} = IdParams.parse(request.params);
    await runner.cancel(id);
    return await repository.getJob(id);
  });

  app.post('/api/jobs/:id/retry', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const job = await repository.retryJob(id);
    runner.enqueue();
    return reply.status(202).send(job);
  });

  app.get('/api/jobs/:id/events', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    await repository.getJob(id);
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    // Reading the job now costs a round trip when the datasource runs out of
    // process, so a burst of progress updates must not interleave writes.
    let inflight = false;
    let pending = false;
    const send = async (changedId?: string) => {
      if (changedId && changedId !== id) return;
      if (inflight) {
        pending = true;
        return;
      }
      inflight = true;
      try {
        const detail = await repository.getJobDetail(id);
        reply.raw.write(`event: job\ndata: ${JSON.stringify(detail)}\n\n`);
      } finally {
        inflight = false;
        if (pending) {
          pending = false;
          void send();
        }
      }
    };
    void send();
    const unsubscribe = runner.subscribe(send);
    const heartbeat = setInterval(() => reply.raw.write(': heartbeat\n\n'), 15_000);
    request.raw.once('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.get('/api/artifacts/:id/download', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const path = resolve(await repository.artifactPath(id));
    const managedRoot = resolve('.video-kit');
    const generatedRoot = resolve('public', 'generated');
    const allowed =
      path.startsWith(`${managedRoot}${sep}`) ||
      path.startsWith(`${generatedRoot}${sep}`);
    if (!allowed || !existsSync(path)) throw new Error('Artifact not found.');
    const jobs = await repository.listJobs();
    const perJob = await Promise.all(
      jobs.map((job) => repository.listArtifacts(job.id)),
    );
    const artifact = perJob.flat().find((entry) => entry.id === id);
    if (!artifact) throw new Error('Artifact not found.');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${artifact.filename.replaceAll('"', '')}"`,
    );
    reply.type(artifact.mimeType);
    return reply.send(createReadStream(path));
  });

  const webRoot = resolve('studio', 'dist');
  const generatedRoot = resolve('public', 'generated');
  const imagesRoot = resolve('public', 'images');
  mkdirSync(generatedRoot, {recursive: true});
  mkdirSync(imagesRoot, {recursive: true});
  await app.register(fastifyStatic, {
    root: generatedRoot,
    prefix: '/generated/',
    decorateReply: false,
  });
  await app.register(fastifyStatic, {
    root: imagesRoot,
    prefix: '/images/',
    decorateReply: false,
  });
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, {root: webRoot});
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({error: 'API route not found.'});
      }
      return reply.sendFile('index.html');
    });
  }

  app.addHook('onClose', async () => {
    ai.close();
    localVoice.close();
    repository.close();
  });
  runner.enqueue();
  return {app, repository, runner};
};
