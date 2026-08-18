import type {StudioRepository} from './sqlite/repository';

type AnyFunction = (...args: never[]) => unknown;

/**
 * Every method, allowed to answer either directly or with a promise.
 *
 * The embedded SQLite adapter is synchronous and satisfies this as-is; the HTTP
 * adapter always returns promises. Callers `await` regardless, so the same code
 * runs against a store in this process or one in another.
 *
 * Derived from the SQLite class rather than hand-written, so a method cannot be
 * added to the store and forgotten here.
 */
type MaybeAsync<T> = {
  [K in keyof T as T[K] extends AnyFunction ? K : never]: T[K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => R | Promise<Awaited<R>>
    : never;
};

/**
 * The persistence port. Note it exposes no `database` handle and no
 * `storageRoot` — those are SQLite and filesystem details. Code that needs the
 * storage root reads it from `@video-kit/core/config`, which is where the path
 * is decided anyway.
 */
export type Repository = MaybeAsync<StudioRepository>;
