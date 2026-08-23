import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fromRoot, paths} from '@video-kit/core/config';
import {narrationSpeechMap} from '@video-kit/core/tts';
import {languageForVoice, pythonExecutable, runProcess} from '../process';
import type {VoiceProvider} from './types';

/**
 * The default local voice.
 *
 * Kokoro reads the whole SRT in one pass rather than scene by scene, so the
 * cue sheet written earlier is its input and is deliberately not rewritten
 * here. Synthesis is expensive and deterministic, so the result is cached
 * against everything that would change it — the script, the voice settings and
 * the locale.
 */
export const kokoroVoiceProvider: VoiceProvider = {
  id: 'kokoro',
  async synthesize({spec, snapshot, active, files, event}) {
    const voice = snapshot.channel.voice;
    const speechMap = join(files.generatedRoot, 'speech-map.json');
    const spokenNarrations = narrationSpeechMap(
      spec.scenes
        .filter((scene) => Boolean(scene.narration?.trim()))
        .map((scene) => scene.narration!.trim()),
    );
    writeFileSync(speechMap, `${JSON.stringify(spokenNarrations, null, 2)}\n`);

    const cacheKey = createHash('sha256')
      .update(
        JSON.stringify({
          srt: readFileSync(files.captionsPath, 'utf8'),
          spokenNarrations,
          model: voice.model,
          preset: voice.preset,
          speed: voice.speed,
          maxSpeed: voice.maxSpeed,
          locale: snapshot.variant.locale,
        }),
      )
      .digest('hex');
    const cacheRoot = join(paths.cache(), 'studio-audio');
    const cachedAudio = join(cacheRoot, `${cacheKey}.wav`);
    const cachedTimings = join(cacheRoot, `${cacheKey}.json`);
    mkdirSync(cacheRoot, {recursive: true});

    if (existsSync(cachedAudio) && existsSync(cachedTimings)) {
      copyFileSync(cachedAudio, files.finalAudio);
      copyFileSync(cachedTimings, files.timingsPath);
      await event('Reused the matching cached voice track.', 0.27);
      return {};
    }

    const ttsArguments = [
      fromRoot('packages', 'cli', 'python', 'local-tts-from-srt.py'),
      '--srt',
      files.captionsPath,
      '--out',
      files.rawAudio,
      '--voice',
      voice.preset,
      '--speed',
      String(voice.speed),
      '--model',
      voice.model,
      '--language',
      languageForVoice(snapshot.variant.locale, voice.language),
      '--timings',
      files.timingsPath,
      '--speech-map',
      speechMap,
    ];
    if (voice.maxSpeed !== undefined) {
      ttsArguments.push('--max-speed', String(voice.maxSpeed));
    }
    await runProcess(pythonExecutable(), ttsArguments, paths.root, active);
    await runProcess(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        files.rawAudio,
        '-af',
        `loudnorm=I=${voice.targetLufs}:TP=${voice.truePeakDb}:LRA=${voice.loudnessRange}`,
        files.finalAudio,
      ],
      paths.root,
      active,
    );
    copyFileSync(files.finalAudio, cachedAudio);
    copyFileSync(files.timingsPath, cachedTimings);
    return {};
  },
};
