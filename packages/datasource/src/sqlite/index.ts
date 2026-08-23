export {
  MIGRATIONS_DIR,
  StudioRepository,
} from './repository';
export type {SqliteRepositoryOptions} from './repository';

import {StudioRepository, type SqliteRepositoryOptions} from './repository';

/** The embedded adapter: the repository running in the caller's own process. */
export const createSqliteRepository = (options: SqliteRepositoryOptions = {}) =>
  new StudioRepository(options);
