import {Config} from '@remotion/cli/config';
import {resolve} from 'node:path';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('angle');
// The composition tree lives in packages/render-kit, so Remotion can no longer
// infer the asset root by walking up from the entry point. Pin it explicitly or
// every staticFile() asset resolves to nothing.
Config.setPublicDir(resolve('public'));
