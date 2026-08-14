/**
 * Load video specs directly from the TypeScript registries without bundling
 * the Remotion project or starting a headless browser.
 *
 * Node 22.18+ strips type annotations from .ts imports natively; the resolver
 * hook below adds the one thing Node does not do on its own — resolving the
 * project's extensionless relative imports to their .ts files. The registry
 * import chain is pure data (React components are only ever referenced with
 * `import type`), so no JSX has to load.
 */
import {existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    const hasExtension = /\.[a-zA-Z]+$/.test(specifier);
    if (isRelative && !hasExtension && context.parentURL?.startsWith('file:')) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const src = (path) => pathToFileURL(join(process.cwd(), 'src', path)).href;

/** Returns [{spec, channel}] for production videos, plus style guides on request. */
export const loadSpecs = async ({includeStyleGuides = false} = {}) => {
  const [videos, channels] = await Promise.all([
    import(src('videos/registry.ts')),
    import(src('channels/registry.ts')),
  ]);
  const specs = includeStyleGuides ? videos.STUDIO_VIDEOS : videos.VIDEOS;
  return specs.map((spec) => ({spec, channel: channels.getChannel(spec.channel)}));
};
