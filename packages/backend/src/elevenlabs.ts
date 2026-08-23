import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {spawn} from 'node:child_process';

const runFfmpeg = (input: string, output: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        input,
        '-ac',
        '1',
        '-ar',
        '24000',
        output,
      ],
      {stdio: ['ignore', 'ignore', 'pipe']},
    );
    let error = '';
    child.stderr.on('data', (chunk) => {
      error = `${error}${String(chunk)}`.slice(-2_000);
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Cloud voice conversion failed: ${error}`));
    });
  });

export class ElevenLabsVoiceProvider {
  configured() {
    return Boolean(process.env.ELEVENLABS_API_KEY);
  }

  async synthesize(input: {
    text: string;
    voiceId: string;
    outputPath: string;
    speed: number;
  }) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ElevenLabs is not configured. Add ELEVENLABS_API_KEY locally.',
      );
    }
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(input.voiceId)) {
      throw new Error('The configured ElevenLabs voice ID is invalid.');
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: input.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0,
            speed: input.speed,
            use_speaker_boost: true,
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `ElevenLabs voice generation failed with HTTP ${response.status}.`,
      );
    }
    mkdirSync(dirname(input.outputPath), {recursive: true});
    const temporary = `${input.outputPath}.mp3`;
    writeFileSync(temporary, Buffer.from(await response.arrayBuffer()), {
      mode: 0o600,
    });
    try {
      await runFfmpeg(temporary, input.outputPath);
    } finally {
      rmSync(temporary, {force: true});
    }
    return {outputPath: input.outputPath};
  }
}

