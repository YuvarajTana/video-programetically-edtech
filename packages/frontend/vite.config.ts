import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {defineConfig, loadEnv} from 'vite';

/**
 * The workspace root is two levels up. public/ stays there because Remotion's
 * staticFile(), the API's static mounts and this dev server all read the same
 * asset root; moving it into a package would break the other two.
 */
const workspaceRoot = resolve(import.meta.dirname, '..', '..');

export default defineConfig(({mode}) => {
  const environment = loadEnv(mode, workspaceRoot, '');
  const apiPort = Number(environment.VIDEO_KIT_PORT || 4311);
  const webPort = Number(environment.VIDEO_KIT_WEB_PORT || 4310);

  if (!Number.isInteger(apiPort) || !Number.isInteger(webPort)) {
    throw new Error('VIDEO_KIT_PORT and VIDEO_KIT_WEB_PORT must be integers.');
  }
  if (apiPort === webPort) {
    throw new Error('VIDEO_KIT_PORT and VIDEO_KIT_WEB_PORT must be different.');
  }

  return {
    root: import.meta.dirname,
    publicDir: resolve(workspaceRoot, 'public'),
    plugins: [react()],
    resolve: {
      // The workspace packages ship TypeScript source and are symlinked, so a
      // second copy of React would otherwise slip in through render-kit.
      dedupe: ['react', 'react-dom', 'remotion', '@remotion/player'],
    },
    optimizeDeps: {
      exclude: ['@video-kit/core', '@video-kit/render-kit', '@video-kit/catalog'],
    },
    server: {
      host: '127.0.0.1',
      port: webPort,
      strictPort: true,
      fs: {allow: [workspaceRoot]},
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
    build: {
      outDir: resolve(import.meta.dirname, 'dist'),
      emptyOutDir: true,
    },
  };
});
