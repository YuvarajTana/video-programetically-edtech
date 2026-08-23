/**
 * Convenience barrel. Prefer the narrower subpath exports
 * (`@video-kit/core/spec`, `@video-kit/core/contracts`, …) in package code so a
 * consumer only loads what it uses; this barrel exists for tests and scripts.
 *
 * This entry point is isomorphic: it must never reach for `node:*`. Filesystem
 * and environment access lives behind `@video-kit/core/config`, so the browser
 * bundle can import the barrel safely.
 */
export * from './spec';
export * from './channels';
export * from './themes';
export * from './publishing';
export * from './output';
export * from './design/formats';
export * from './design/tokens';
export * from './contracts';
export * from './editorial';
export {MANAGED_COMPOSITION_IDS, managedDefaults} from './managed';
export type {ManagedVideoInput} from './managed';
