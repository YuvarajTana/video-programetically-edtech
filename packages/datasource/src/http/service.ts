import Fastify from 'fastify';
import {config, loadEnv} from '@video-kit/core/config';
import {createSqliteRepository} from '../sqlite';
import type {Repository} from '../port';
import {BLOCKED_METHODS, type CallRequest} from './protocol';

/**
 * The datasource as its own process.
 *
 * It owns the database and the storage root; the backend reaches it over HTTP
 * and never opens the SQLite file itself.
 */
export const createDatasourceApp = async ({
  repository = createSqliteRepository(),
}: {repository?: Repository} = {}) => {
  const app = Fastify({logger: true, bodyLimit: 8_000_000});

  app.get('/health', async () => ({
    ok: true,
    service: 'video-kit-datasource',
    time: new Date().toISOString(),
  }));

  app.post('/call', async (request, reply) => {
    const {method, args} = request.body as CallRequest;

    if (typeof method !== 'string' || BLOCKED_METHODS.has(method)) {
      return reply.status(403).send({ok: false, error: `Method "${method}" is not callable.`, status: 403});
    }
    const target = (repository as unknown as Record<string, unknown>)[method];
    if (typeof target !== 'function') {
      return reply.status(404).send({ok: false, error: `Unknown method "${method}".`, status: 404});
    }

    try {
      const value = await (target as (...a: unknown[]) => unknown).apply(
        repository,
        Array.isArray(args) ? args : [],
      );
      return {ok: true, value: value ?? null};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // The backend re-throws these, and its own error handler maps the wording
      // to a status, so the classification stays in one place.
      const status = /not found|does not exist/i.test(message)
        ? 404
        : /UNIQUE constraint|already/i.test(message)
          ? 409
          : 400;
      return reply.status(status).send({ok: false, error: message, status});
    }
  });

  app.addHook('onClose', async () => repository.close());
  return {app, repository};
};

/** Entry point for `npm run dev -w @video-kit/datasource`. */
export const start = async () => {
  loadEnv();
  const {app} = await createDatasourceApp();
  const host = config.host();
  const port = config.dataPort();
  await app.listen({host, port});
  console.log(`Video Kit datasource is ready at http://${host}:${port}`);
};
