import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {IdentifierSchema, ScriptGenerationInputSchema} from '@video-kit/core/contracts';
import {LANGUAGES} from '@video-kit/core/languages';
import {MUSIC_TRACKS, musicTrackById} from '@video-kit/core/music';
import {paths} from '@video-kit/core/config';
import {createReadStream, existsSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import type {RouteDeps} from './deps';

const NamedIdParams = z.object({id: IdentifierSchema});

/** Health, the seeded catalog, languages, music beds, and AI script drafting. */
export const catalogRoutes = async (
  app: FastifyInstance,
  {repository, ai, localVoice, scriptGenerator}: RouteDeps,
) => {
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
    const path = resolve(paths.public(), track.src);
    const musicRoot = join(paths.public(), 'audio', 'music');
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
};
