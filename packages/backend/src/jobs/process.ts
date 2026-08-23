import {spawn, type ChildProcess} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fromRoot, paths} from '@video-kit/core/config';

/** A job that is currently running, and the child process it may be blocked on. */
export type ActiveJob = {
  cancel: () => void;
  child: ChildProcess | null;
};

/** Strip the workspace path and anything that looks like a credential. */
export const safeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replaceAll(paths.root, '<project>')
    .replace(/(?:api[-_]?key|token|secret)=\S+/gi, '$1=<redacted>')
    .slice(0, 2_000);
};

export const checksum = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

/**
 * Spawn a child and capture its output, recording it on the active job so a
 * cancellation can signal it.
 */
export const runProcess = (
  command: string,
  args: string[],
  cwd: string,
  active: ActiveJob,
) =>
  new Promise<{stdout: string; stderr: string}>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    active.child = child;
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (value) => {
      stdout += String(value);
    });
    child.stderr.on('data', (value) => {
      stderr += String(value);
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      active.child = null;
      if (code === 0) resolvePromise({stdout, stderr});
      else reject(new Error(`${command} stopped (${signal ?? code}): ${stderr || stdout}`));
    });
  });

export const pythonExecutable = () => {
  const requested = process.env.TTS_PYTHON;
  const candidates = [
    requested,
    fromRoot('.venv-tts/bin/python3'),
    fromRoot('.venv-tts/bin/python'),
    'python3',
  ].filter(Boolean) as string[];
  return candidates[0];
};

export const languageForVoice = (locale: string, fallback: string) => {
  if (locale.toLowerCase() === 'en-gb') return 'b';
  if (locale.toLowerCase().startsWith('en')) return 'a';
  return fallback;
};
