import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {CreateJobSchema} from '@video-kit/core/contracts';
import {paths} from '@video-kit/core/config';
import {createReadStream, existsSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import type {RouteDeps} from './deps';

const IdParams = z.object({id: z.uuid()});

/** Queueing production and translation work, watching it, and downloading it. */
export const jobRoutes = async (app: FastifyInstance, {repository, runner}: RouteDeps) => {
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
    const managedRoot = paths.managed();
    const generatedRoot = paths.generated();
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
};
