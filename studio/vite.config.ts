import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const workspaceRoot = resolve('.');
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
    root: resolve('studio'),
    publicDir: resolve('public'),
    plugins: [react()],
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
      outDir: resolve('studio/dist'),
      emptyOutDir: true,
    },
  };
});
