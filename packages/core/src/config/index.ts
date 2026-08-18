/**
 * The single place environment variables and workspace paths are resolved.
 *
 * Before this module every process re-derived its own paths from `process.cwd()`,
 * so the API only worked when launched from the repository root, and `.env` was
 * loaded in exactly one file. Both are now decided here, once, for every
 * process: the API, the datasource service, the CLI, and the tests.
 */
import {existsSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Walk up from this file to the workspace root. `packages/core/src/config` is
 * four levels down, but the marker check keeps this correct if the package is
 * ever nested differently.
 */
const findWorkspaceRoot = () => {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 10; depth++) {
    if (
      existsSync(join(directory, 'package.json')) &&
      existsSync(join(directory, 'packages'))
    ) {
      return directory;
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  // Standalone checkouts (no packages/ dir) fall back to the launch directory.
  return process.cwd();
};

export const WORKSPACE_ROOT = findWorkspaceRoot();

/** Resolve a workspace-relative path. Absolute inputs pass through untouched. */
export const fromRoot = (...segments: string[]) => {
  const [first] = segments;
  return first && isAbsolute(first)
    ? resolve(first)
    : resolve(WORKSPACE_ROOT, ...segments);
};

let envLoaded = false;

/**
 * Load `.env` from the workspace root. Idempotent, so every entry point can
 * call it without coordinating with the others.
 */
export const loadEnv = () => {
  if (envLoaded) return;
  envLoaded = true;
  const envPath = fromRoot('.env');
  if (existsSync(envPath)) process.loadEnvFile(envPath);
};

const str = (name: string, fallback: string) => process.env[name] || fallback;

const int = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer, received "${raw}".`);
  }
  return value;
};

const optionalInt = (name: string) => {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number, received "${raw}".`);
  }
  return value;
};

/** Every directory the kit reads from or writes to. */
export const paths = {
  root: WORKSPACE_ROOT,
  /** Shared asset root: Remotion `staticFile()`, Vite `publicDir`, Fastify static. */
  public: () => fromRoot('public'),
  generated: () => fromRoot('public', 'generated'),
  images: () => fromRoot('public', 'images'),
  content: () => fromRoot('content'),
  scriptContext: () => fromRoot('content', 'script-generation', 'context.json'),
  migrations: () => fromRoot('migrations'),
  /** Local runtime state: SQLite database, uploads, model cache, job artifacts. */
  managed: () => dirname(config.databasePath()),
  jobs: () => join(dirname(config.databasePath()), 'jobs'),
  models: () => join(dirname(config.databasePath()), 'models'),
  cache: () => fromRoot(str('VIDEO_KIT_CACHE_DIR', '.cache/video-kit')),
  /** CLI render output. */
  out: () => fromRoot('out'),
  /** Built studio bundle, served by the API when it exists. */
  web: () => fromRoot('packages', 'frontend', 'dist'),
} as const;

export const config = {
  /** Fastify API. */
  apiPort: () => int('VIDEO_KIT_PORT', 4311),
  /** Vite studio dev server. */
  webPort: () => int('VIDEO_KIT_WEB_PORT', 4310),
  /** Datasource service, when run out of process. */
  dataPort: () => int('VIDEO_KIT_DATA_PORT', 4312),
  host: () => str('VIDEO_KIT_HOST', '127.0.0.1'),

  databasePath: () => fromRoot(str('VIDEO_KIT_DB_PATH', '.video-kit/video-kit.db')),
  /** `embedded` runs the repository in process; a URL points at the service. */
  datasource: () => str('VIDEO_KIT_DATASOURCE', 'embedded'),

  renderConcurrency: () => optionalInt('RENDER_CONCURRENCY'),
  browserExecutable: () => process.env.REMOTION_BROWSER_EXECUTABLE || null,
  chromeMode: () => process.env.REMOTION_CHROME_MODE || undefined,

  ttsPython: () => str('TTS_PYTHON', '.venv-tts/bin/python3'),
  indicPython: () => str('INDIC_AI_PYTHON', '.venv-indic/bin/python3'),
  localVoicePython: () => str('LOCAL_VOICE_PYTHON', '.venv-local-voice/bin/python3'),

  openAiKey: () => process.env.OPENAI_API_KEY,
  openAiScriptModel: () => str('OPENAI_SCRIPT_MODEL', 'gpt-5.6-sol'),
  elevenLabsKey: () => process.env.ELEVENLABS_API_KEY,
} as const;
