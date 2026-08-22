import type DatabaseType from 'better-sqlite3';
import type {StudioRepository} from '../repository';

/**
 * What a domain module is given.
 *
 * `repository` is how a domain reaches another one. That coupling is real —
 * creating a job touches variants, voices, narrations and revisions, and does
 * so inside the same call — so it is passed explicitly rather than pretended
 * away. Public methods stay flat on the repository because the port is derived
 * from the class and the HTTP transport dispatches by method name; these
 * modules hold the bodies, not the surface.
 */
export type DomainContext = {
  database: DatabaseType.Database;
  storageRoot: string;
  repository: StudioRepository;
};

export type Row = Record<string, unknown>;

export const now = () => new Date().toISOString();

export const parse = <T>(value: string): T => JSON.parse(value) as T;
