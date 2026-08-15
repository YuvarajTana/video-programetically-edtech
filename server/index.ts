import {existsSync} from 'node:fs';
import {createStudioApp} from './app';

if (existsSync('.env')) process.loadEnvFile('.env');

const port = Number(process.env.VIDEO_KIT_PORT ?? 4311);
const host = '127.0.0.1';
const {app} = await createStudioApp();

await app.listen({host, port});
console.log(`Video Kit Studio is ready at http://${host}:${port}`);
