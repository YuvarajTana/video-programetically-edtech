import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import Fastify from 'fastify';
import {existsSync, mkdirSync} from 'node:fs';
import {ZodError} from 'zod';
import {paths} from '@video-kit/core/config';
import {createRepository, type Repository} from '@video-kit/datasource';
import {JobRunner} from './pipeline';
import {LocalAiWorker} from './local-ai';
import {ChatterboxVoiceWorker} from './local-voice';
import {ElevenLabsVoiceProvider} from './elevenlabs';
import {OpenAiScriptGenerator, type ScriptGenerator} from './openai-script';
import {
  catalogRoutes,
  jobRoutes,
  legacyRoutes,
  libraryRoutes,
  projectRoutes,
  voiceRoutes,
  type RouteDeps,
} from './routes';

/**
 * Assembles the API.
 *
 * The routes themselves live in ./routes, one plugin per domain; this file
 * owns only what is genuinely shared — the dependency wiring, error mapping,
 * static roots, and shutdown. Every dependency stays injectable, which is how
 * the tests run the whole app against fakes.
 */
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
      .send({error: message.replaceAll(paths.root, '<project>')});
  });

  const deps: RouteDeps = {
    repository,
    runner,
    ai,
    cloudVoice,
    localVoice,
    scriptGenerator,
  };
  for (const routes of [
    catalogRoutes,
    libraryRoutes,
    projectRoutes,
    legacyRoutes,
    jobRoutes,
    voiceRoutes,
  ]) {
    await app.register((instance) => routes(instance, deps));
  }

  const webRoot = paths.web();
  const generatedRoot = paths.generated();
  const imagesRoot = paths.images();
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
    await repository.close();
  });
  runner.enqueue();
  return {app, repository, runner};
};
