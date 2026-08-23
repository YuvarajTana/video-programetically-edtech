/**
 * Locating the Remotion project.
 *
 * The entry point is resolved through the package exports map rather than a
 * hard-coded path, and it is resolved to a *path* — never imported — so the
 * Node process never loads React just to hand a file to the bundler.
 *
 * `publicDir` must be passed explicitly: Remotion otherwise infers it by
 * walking up from the entry point, which since the move to packages/ would
 * find the wrong directory (or none) and silently drop every staticFile asset.
 */
import {fileURLToPath} from 'node:url';
import {paths} from '@video-kit/core/config';

export const RENDER_KIT_ENTRY = fileURLToPath(
  import.meta.resolve('@video-kit/render-kit/entry'),
);

export const PUBLIC_DIR = paths.public();

/** Spread into any `bundle()` call so the entry and assets stay in step. */
export const bundleOptions = {
  entryPoint: RENDER_KIT_ENTRY,
  publicDir: PUBLIC_DIR,
};
