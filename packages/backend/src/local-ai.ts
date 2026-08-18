import {fromRoot, paths} from '@video-kit/core/config';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {createInterface} from 'node:readline';
import type {ModelStatus} from '@video-kit/core/contracts';
import {languageFor} from '@video-kit/core/languages';

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type WorkerResponse = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export interface TranslationProvider {
  translate(input: {
    texts: string[];
    sourceLocale: string;
    targetLocale: string;
  }): Promise<{translations: string[]; pivots: Array<string | null>}>;
}

export interface IndicVoiceProvider {
  synthesize(input: {
    text: string;
    locale: string;
    referencePath: string;
    referenceTranscript: string;
    outputPath: string;
    speed: number;
    engine?: 'f5tts' | 'indicf5';
  }): Promise<{outputPath: string}>;
}

const pythonExecutable = () => {
  const requested = process.env.INDIC_AI_PYTHON;
  const candidates = [
    requested,
    fromRoot('.venv-indic/bin/python3'),
    fromRoot('.venv-indic/bin/python'),
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

export class LocalAiWorker
  implements TranslationProvider, IndicVoiceProvider
{
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly pending = new Map<string, Pending>();

  modelStatus(): ModelStatus[] {
    const installed = Boolean(pythonExecutable() && existsSync(pythonExecutable()));
    const device =
      installed && process.platform === 'darwin'
        ? 'mps'
        : installed
          ? 'cpu'
          : 'unavailable';
    const detail = installed
      ? 'Local worker installed. Models download into .video-kit/models on first use.'
      : 'Run npm run ai:setup to install the private local worker.';
    return [
      {
        id: 'indictrans2',
        label: 'IndicTrans2 translation',
        installed,
        device,
        detail,
      },
      {
        id: 'f5tts',
        label: 'F5-TTS English voice cloning',
        installed,
        device,
        detail,
      },
      {
        id: 'indicf5',
        label: 'IndicF5 voice cloning',
        installed,
        device,
        detail,
      },
    ];
  }

  async translate(input: {
    texts: string[];
    sourceLocale: string;
    targetLocale: string;
  }) {
    return this.request<{
      translations: string[];
      pivots: Array<string | null>;
    }>({
      op: 'translate',
      texts: input.texts,
      source: languageFor(input.sourceLocale).indicTransCode,
      target: languageFor(input.targetLocale).indicTransCode,
    });
  }

  async synthesize(input: {
    text: string;
    locale: string;
    referencePath: string;
    referenceTranscript: string;
    outputPath: string;
    speed: number;
    engine?: 'f5tts' | 'indicf5';
  }) {
    return this.request<{outputPath: string}>({
      op: 'tts',
      ...input,
      engine: input.engine ?? 'indicf5',
      language: languageFor(input.locale).indicTransCode,
    });
  }

  close() {
    this.child?.kill('SIGTERM');
    this.child = null;
  }

  private start() {
    if (this.child && !this.child.killed) return this.child;
    const executable = pythonExecutable();
    if (!executable || !existsSync(executable)) {
      throw new Error(
        'Local Indic AI is not installed. Run npm run ai:setup first.',
      );
    }
    const child = spawn(
      executable,
      [fromRoot('packages', 'cli', 'python', 'indic-ai-worker.py'), '--stdio'],
      {
        cwd: paths.root,
        env: {
          ...process.env,
          VIDEO_KIT_MODEL_DIR: paths.models(),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const lines = createInterface({input: child.stdout});
    lines.on('line', (line) => {
      let message: WorkerResponse;
      try {
        message = JSON.parse(line) as WorkerResponse;
      } catch {
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.ok) pending.resolve(message.result);
      else pending.reject(new Error(message.error ?? 'Local AI worker failed.'));
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-4_000);
    });
    child.once('exit', (code, signal) => {
      const error = new Error(
        `Local AI worker stopped (${signal ?? code}): ${stderr}`.slice(0, 4_000),
      );
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.pending.clear();
      this.child = null;
    });
    this.child = child;
    return child;
  }

  private request<T>(payload: Record<string, unknown>): Promise<T> {
    const child = this.start();
    const id = randomUUID();
    return new Promise<T>((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Local AI worker timed out.'));
      }, 30 * 60 * 1_000);
      this.pending.set(id, {
        resolve: (value) => resolvePromise(value as T),
        reject,
        timer,
      });
      child.stdin.write(`${JSON.stringify({id, ...payload})}\n`);
    });
  }
}
