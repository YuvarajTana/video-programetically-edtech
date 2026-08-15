import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import type {ModelStatus} from '../shared/contracts';

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

export interface LocalVoiceProvider {
  synthesize(input: {
    text: string;
    referencePath: string;
    outputPath: string;
  }): Promise<{outputPath: string}>;
}

const pythonExecutable = () => {
  const candidates = [
    process.env.LOCAL_VOICE_PYTHON,
    resolve('.venv-local-voice/bin/python3'),
    resolve('.venv-local-voice/bin/python'),
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

const installedDevice = (executable: string | undefined) => {
  if (!executable || !existsSync(executable)) return 'unavailable' as const;
  const probe = spawnSync(
    executable,
    [
      '-c',
      'import torch; print("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")',
    ],
    {encoding: 'utf8', timeout: 10_000},
  );
  return probe.status === 0 && probe.stdout.trim() === 'mps'
    ? ('mps' as const)
    : ('cpu' as const);
};

export class ChatterboxVoiceWorker implements LocalVoiceProvider {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly pending = new Map<string, Pending>();

  modelStatus(): ModelStatus {
    const executable = pythonExecutable();
    const installed = Boolean(executable && existsSync(executable));
    return {
      id: 'chatterbox',
      label: 'My Voice · local English cloning',
      installed,
      device: installedDevice(executable),
      detail: installed
        ? 'Local Chatterbox worker installed. The model downloads on first use.'
        : 'Run npm run voice:setup to install the local My Voice engine.',
    };
  }

  async synthesize(input: {
    text: string;
    referencePath: string;
    outputPath: string;
  }) {
    return this.request<{outputPath: string}>({op: 'tts', ...input});
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
        'The local My Voice engine is not installed. Run npm run voice:setup first.',
      );
    }
    const child = spawn(
      executable,
      [resolve('scripts', 'local-voice-worker.py'), '--stdio'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HF_HOME: resolve('.video-kit', 'models', 'huggingface'),
          TORCH_HOME: resolve('.video-kit', 'models', 'torch'),
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
      else pending.reject(new Error(message.error ?? 'Local voice worker failed.'));
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-4_000);
    });
    child.once('exit', (code, signal) => {
      const error = new Error(
        `Local voice worker stopped (${signal ?? code}): ${stderr}`.slice(0, 4_000),
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
        reject(new Error('Local voice generation timed out.'));
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
