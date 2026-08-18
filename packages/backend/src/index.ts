import {config, loadEnv} from '@video-kit/core/config';
import {createStudioApp} from './app';

loadEnv();

const port = config.apiPort();
const host = config.host();
const {app} = await createStudioApp();

await app.listen({host, port});
console.log(`Video Kit Studio is ready at http://${host}:${port}`);
