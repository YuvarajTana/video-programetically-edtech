import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {paths} from '@video-kit/core/config';
import {captionsFor} from '../captions';
import {runProcess} from '../process';
import type {VoiceContext, VoiceProvider, VoiceResult} from './types';

/** Synthesize one scene's narration to a wav file. */
type SceneSynthesizer = (input: {text: string; outputPath: string}) => Promise<void>;

/**
 * The assembly every cloned-voice provider shares.
 *
 * Each scene is synthesized on its own, measured with ffprobe, padded to leave
 * a breath after the line, and the scene is retimed to the audio that actually
 * came back — so the video follows the voice rather than the other way round.
 * The padded clips are then concatenated and loudness-normalised into one
 * master.
 */
export const synthesizePerScene = async (
  context: VoiceContext,
  synthesizeScene: SceneSynthesizer,
): Promise<VoiceResult> => {
  const {spec, snapshot, active, files} = context;
  const voice = snapshot.channel.voice;
  const clipsRoot = join(files.generatedRoot, 'scenes');
  mkdirSync(clipsRoot, {recursive: true});

  const concatLines: string[] = [];
  const cueData: Array<{
    index: number;
    start: number;
    end: number;
    text: string;
    words: Array<{text: string; start: number; end: number}>;
  }> = [];
  let cursorSeconds = 0;

  for (const [index, scene] of spec.scenes.entries()) {
    if (!scene.narration?.trim()) continue;
    const clip = join(clipsRoot, `${String(index).padStart(3, '0')}.wav`);
    await synthesizeScene({text: scene.narration, outputPath: clip});

    const {stdout} = await runProcess(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        clip,
      ],
      paths.root,
      active,
    );
    const audioDuration = Number(stdout.trim());
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
      throw new Error(`Could not measure narration for scene ${index + 1}.`);
    }

    const sceneDuration = audioDuration + 0.6;
    const paddedClip = join(clipsRoot, `${String(index).padStart(3, '0')}-padded.wav`);
    await runProcess(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        clip,
        '-af',
        'apad=pad_dur=0.6',
        '-t',
        String(sceneDuration),
        paddedClip,
      ],
      paths.root,
      active,
    );
    scene.durationInFrames = Math.max(
      15,
      Math.min(18_000, Math.ceil(sceneDuration * (spec.fps ?? 30))),
    );

    const words = scene.narration.trim().split(/\s+/u);
    const wordDuration = audioDuration / Math.max(1, words.length);
    cueData.push({
      index: cueData.length + 1,
      start: cursorSeconds,
      end: cursorSeconds + audioDuration,
      text: scene.narration,
      words: words.map((text, wordIndex) => ({
        text,
        start: cursorSeconds + wordIndex * wordDuration,
        end: cursorSeconds + (wordIndex + 1) * wordDuration,
      })),
    });
    cursorSeconds += sceneDuration;
    concatLines.push(`file '${paddedClip.replaceAll("'", "'\\''")}'`);
  }

  if (!concatLines.length) {
    throw new Error('The storyboard has no narration to synthesize.');
  }

  const concatFile = join(clipsRoot, 'concat.txt');
  writeFileSync(concatFile, `${concatLines.join('\n')}\n`);
  await runProcess(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatFile,
      '-af',
      `loudnorm=I=${voice.targetLufs}:TP=${voice.truePeakDb}:LRA=${voice.loudnessRange}`,
      files.finalAudio,
    ],
    paths.root,
    active,
  );

  writeFileSync(
    files.timingsPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        locale: snapshot.variant.locale,
        durationSeconds: cursorSeconds,
        cues: cueData,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(files.captionsPath, captionsFor(spec));
  return {};
};

/** The approved voice profile this variant clones, resolved once per job. */
const selectedProfile = async ({snapshot, repository}: VoiceContext) => {
  const versionId = snapshot.variant.voiceProfileVersionId;
  if (!versionId) throw new Error('The localized variant has no voice profile.');
  return repository.voiceProfileForProduction(versionId, snapshot.variant.locale);
};

export const chatterboxVoiceProvider: VoiceProvider = {
  id: 'chatterbox',
  async synthesize(context) {
    const selected = await selectedProfile(context);
    return synthesizePerScene(context, async ({text, outputPath}) => {
      await context.workers.localVoice.synthesize({
        text,
        referencePath: selected.samplePath,
        outputPath,
      });
    });
  },
};

export const elevenLabsVoiceProvider: VoiceProvider = {
  id: 'elevenlabs',
  async synthesize(context) {
    const selected = await selectedProfile(context);
    return synthesizePerScene(context, async ({text, outputPath}) => {
      await context.workers.cloudVoice.synthesize({
        text,
        voiceId: selected.version.model,
        outputPath,
        speed: context.snapshot.channel.voice.speed,
      });
    });
  },
};

/**
 * IndicF5, and F5-TTS for English. Both run through the same local worker; only
 * the engine differs, and F5-TTS is used solely for en-US.
 */
const indicVoiceProvider = (id: 'f5tts' | 'indicf5'): VoiceProvider => ({
  id,
  async synthesize(context) {
    const selected = await selectedProfile(context);
    const {locale} = context.snapshot.variant;
    return synthesizePerScene(context, async ({text, outputPath}) => {
      await context.workers.ai.synthesize({
        text,
        locale,
        referencePath: selected.samplePath,
        referenceTranscript: selected.sample.transcript,
        outputPath,
        speed: context.snapshot.channel.voice.speed,
        engine: id === 'f5tts' && locale === 'en-US' ? 'f5tts' : 'indicf5',
      });
    });
  },
});

export const f5ttsVoiceProvider = indicVoiceProvider('f5tts');
export const indicF5VoiceProvider = indicVoiceProvider('indicf5');
