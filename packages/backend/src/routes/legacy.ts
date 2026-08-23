import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {IdentifierSchema} from '@video-kit/core/contracts';
import {VIDEOS} from '@video-kit/catalog';
import {totalFrames} from '@video-kit/core/spec';
import type {RouteDeps} from './deps';

/** Reading the source-controlled catalog, and importing one of its specs. */
export const legacyRoutes = async (app: FastifyInstance, {repository}: RouteDeps) => {
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
};
