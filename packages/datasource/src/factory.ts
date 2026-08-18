import {config} from '@video-kit/core/config';
import {createSqliteRepository} from './sqlite';
import type {Repository} from './port';

/**
 * Choose where the store lives.
 *
 * `embedded` (the default) runs SQLite in the caller's process, which is what
 * local development, the CLI and the tests want — no extra process, no network
 * hop. Anything else is treated as the base URL of a datasource service.
 */
export const createRepository = async (
  target = config.datasource(),
): Promise<Repository> => {
  if (target === 'embedded') return createSqliteRepository();
  const {createHttpRepository} = await import('./http/client');
  return createHttpRepository(target);
};
