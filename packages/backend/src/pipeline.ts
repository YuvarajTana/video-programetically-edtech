import {makeCancelSignal} from '@remotion/renderer';
import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {spawn, type ChildProcess} from 'node:child_process';
import {EditableVideoSpecSchema, type JobStage} from '@video-kit/core/contracts';
import {OUTPUT_VARIANTS, variantsFor} from '@video-kit/core/output';
import {config, fromRoot, paths} from '@video-kit/core/config';
import {produceVariants} from '@video-kit/render-engine';
import {
  buildMasterTimeline,
  type WordTimingFile,
} from '@video-kit/core/master-timeline';
import {protectTerms} from '@video-kit/core/localization';
import {narrationSpeechMap} from '@video-kit/core/tts';
import {
  fitScenesToDuration,
  scenesExceedNarrationRate,
} from '@video-kit/core/storyboard';
import type {VideoSpec} from '@video-kit/core/spec';
import type {Repository} from '@video-kit/datasource';
import {LocalAiWorker} from './local-ai';
import {ElevenLabsVoiceProvider} from './elevenlabs';
import {ChatterboxVoiceWorker} from './local-voice';

type Listener = (jobId: string) => void;
type ActiveJob = {
  cancel: () => void;
  child: ChildProcess | null;
};

const safeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replaceAll(paths.root, '<project>')
    .replace(/(?:api[-_]?key|token|secret)=\S+/gi, '$1=<redacted>')
    .slice(0, 2_000);
};

const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const timecode = (frames: number, fps: number) => {
  const total = frames / fps;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  const milliseconds = Math.round((total - Math.floor(total)) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
};

export const captionsFor = (spec: VideoSpec) => {
  const fps = spec.fps ?? 30;
  let cursor = 0;
  const cues: string[] = [];
  for (const scene of spec.scenes) {
    const start = cursor;
    cursor += scene.durationInFrames;
    if (!scene.narration) continue;
    cues.push(
      [
        cues.length + 1,
        `${timecode(start, fps)} --> ${timecode(cursor, fps)}`,
        scene.narration,
        '',
      ].join('\n'),
    );
  }
  return `${cues.join('\n')}\n`;
};

export const configureMusicOnlySpec = (spec: VideoSpec) => {
  if (!spec.soundtrack?.music) {
    throw new Error('Music-only production requires a selected music track.');
  }
  spec.audio = undefined;
  spec.captionTimings = undefined;
  spec.captions = false;
  spec.scenes = spec.scenes.map((scene) => ({
    ...scene,
    narration: undefined,
  })) as VideoSpec['scenes'];
  return spec;
};

const checksum = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const runProcess = (
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

const pythonExecutable = () => {
  const requested = process.env.TTS_PYTHON;
  const candidates = [
    requested,
    fromRoot('.venv-tts/bin/python3'),
    fromRoot('.venv-tts/bin/python'),
    'python3',
  ].filter(Boolean) as string[];
  return candidates[0];
};

const languageForVoice = (locale: string, fallback: string) => {
  if (locale.toLowerCase() === 'en-gb') return 'b';
  if (locale.toLowerCase().startsWith('en')) return 'a';
  return fallback;
};

export class JobRunner {
  private readonly listeners = new Set<Listener>();
  private readonly active = new Map<string, ActiveJob>();
  private processing = false;

  constructor(
    private readonly repository: Repository,
    private readonly ai = new LocalAiWorker(),
    private readonly cloudVoice = new ElevenLabsVoiceProvider(),
    private readonly localVoice = new ChatterboxVoiceWorker(),
  ) {}

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  enqueue() {
    void this.drain();
  }

  async cancel(jobId: string) {
    const job = await this.repository.getJob(jobId);
    if (job.status === 'queued') {
      await this.repository.updateJob(jobId, {
        status: 'cancelled',
        error: 'Cancelled before processing.',
        completedAt: new Date().toISOString(),
      });
      await this.event(jobId, 'queued', 'info', 'Job cancelled.', job.progress);
      return;
    }
    const active = this.active.get(jobId);
    if (!active) throw new Error('This job is not currently cancellable.');
    active.cancel();
    active.child?.kill('SIGTERM');
  }

  private notify(jobId: string) {
    for (const listener of this.listeners) listener(jobId);
  }

  private async event(
    jobId: string,
    stage: JobStage,
    level: 'info' | 'error',
    message: string,
    progress: number,
  ) {
    await this.repository.addJobEvent(jobId, stage, level, message, progress);
    this.notify(jobId);
  }

  private async stage(
    jobId: string,
    stage: JobStage,
    progress: number,
    message: string,
  ) {
    await this.repository.updateJob(jobId, {status: 'running', stage, progress});
    await this.event(jobId, stage, 'info', message, progress);
  }

  private async drain() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (true) {
        const next = (await this.repository.listJobs())
          .filter((job) => job.status === 'queued')
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        if (!next) break;
        await this.run(next.id);
      }
    } finally {
      this.processing = false;
    }
  }

  private async run(jobId: string) {
    const cancellation = makeCancelSignal();
    const active: ActiveJob = {cancel: cancellation.cancel, child: null};
    this.active.set(jobId, active);
    await this.repository.updateJob(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
      error: null,
    });
    try {
      const job = await this.repository.getJob(jobId);
      if (job.kind === 'translation') {
        await this.runTranslation(jobId);
        return;
      }
      const snapshot = await this.repository.getRevision(job.revisionId);
      const jobRoot = join(paths.jobs(), jobId);
      const artifactRoot = join(jobRoot, 'artifacts');
      const publicRoot = paths.public();
      const generatedRoot = join(paths.generated(), jobId);
      mkdirSync(artifactRoot, {recursive: true});
      mkdirSync(generatedRoot, {recursive: true});

      await this.stage(jobId, 'validate', 0.02, 'Validating the immutable project revision.');
      let spec = EditableVideoSpecSchema.parse(snapshot.spec) as VideoSpec;
      const approvedScriptPath = join(artifactRoot, 'approved-script.txt');
      writeFileSync(
        approvedScriptPath,
        `${spec.scenes
          .map((scene) => scene.narration?.trim())
          .filter(Boolean)
          .join('\n\n')}\n`,
      );
      this.recordArtifact(
        jobId,
        approvedScriptPath,
        'script',
        null,
        'text/plain',
      );
      await this.stage(
        jobId,
        'topic',
        0.035,
        `Topic locked: ${spec.editorial?.objective ?? spec.title}`,
      );
      await this.stage(
        jobId,
        'script',
        0.055,
        'The manually approved script is locked to this revision.',
      );
      const musicOnly = !job.generateVoice && Boolean(spec.soundtrack?.music);
      if (musicOnly) configureMusicOnlySpec(spec);
      const totalFrames = spec.scenes.reduce(
        (sum, scene) => sum + scene.durationInFrames,
        0,
      );
      if (totalFrames <= 0) throw new Error('The storyboard has no duration.');

      if (
        job.generateVoice &&
        job.provider === 'kokoro' &&
        scenesExceedNarrationRate(
          spec.scenes,
          snapshot.channel.editorial.maxNarrationWpm,
          spec.fps ?? 30,
        )
      ) {
        fitScenesToDuration(spec.scenes, totalFrames);
        await this.event(
          jobId,
          'validate',
          'info',
          'Rebalanced scene timing to fit the approved narration.',
          0.07,
        );
      }

      const sceneBreakdownPath = join(artifactRoot, 'scene-breakdown.json');
      writeFileSync(
        sceneBreakdownPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            title: spec.title,
            fps: spec.fps ?? 30,
            scenes: spec.scenes.map((scene, index) => ({
              index: index + 1,
              id: scene.id ?? `scene-${index + 1}`,
              type: scene.type,
              durationInFrames: scene.durationInFrames,
              narration: scene.narration ?? null,
            })),
          },
          null,
          2,
        )}\n`,
      );
      this.recordArtifact(
        jobId,
        sceneBreakdownPath,
        'scene-breakdown',
        null,
        'application/json',
      );
      await this.stage(
        jobId,
        'scene-breakdown',
        0.08,
        `${spec.scenes.length} scenes validated with visual types and frame durations.`,
      );
      const captionsPath = join(artifactRoot, 'captions.srt');
      const timingsPath = join(generatedRoot, 'word-timings.json');
      // Kokoro consumes an SRT cue sheet. This is an internal TTS input; the
      // final caption artifact is rebuilt after localized audio retimes scenes.
      if (!musicOnly) writeFileSync(captionsPath, captionsFor(spec));

      await this.stage(
        jobId,
        'tts',
        0.14,
        job.generateVoice
          ? 'Generating scene narration from the approved script.'
          : 'TTS is intentionally skipped for this production.',
      );
      if (job.generateVoice) {
        const rawAudio = join(generatedRoot, 'master-raw.wav');
        const finalAudio = join(generatedRoot, 'master.wav');
        const timings = timingsPath;
        const voice = snapshot.channel.voice;
        if (job.provider === 'uploaded') {
          const narrationId = snapshot.variant.narrationAssetId;
          if (!narrationId) {
            throw new Error('The project has no uploaded narration track.');
          }
          const narration = await this.repository.getNarrationAsset(narrationId);
          const narrationPath = await this.repository.narrationAssetPath(narrationId);
          copyFileSync(narrationPath, finalAudio);
          const fps = spec.fps ?? 30;
          fitScenesToDuration(
            spec.scenes,
            Math.max(spec.scenes.length * 15, Math.round(narration.durationSeconds * fps)),
          );
          let cursorSeconds = 0;
          const cues = spec.scenes.flatMap((scene, sceneIndex) => {
            const sceneDuration = scene.durationInFrames / fps;
            const start = cursorSeconds;
            const end = cursorSeconds + sceneDuration;
            cursorSeconds = end;
            if (!scene.narration?.trim()) return [];
            const words = scene.narration.trim().split(/\s+/u);
            const wordDuration = sceneDuration / Math.max(1, words.length);
            return [{
              index: sceneIndex + 1,
              start,
              end,
              text: scene.narration,
              words: words.map((text, wordIndex) => ({
                text,
                start: start + wordIndex * wordDuration,
                end: start + (wordIndex + 1) * wordDuration,
              })),
            }];
          });
          writeFileSync(
            timings,
            `${JSON.stringify(
              {
                schemaVersion: 1,
                locale: snapshot.variant.locale,
                durationSeconds: narration.durationSeconds,
                alignment: 'estimated-from-approved-script',
                cues,
              },
              null,
              2,
            )}\n`,
          );
          writeFileSync(captionsPath, captionsFor(spec));
          spec.audio = relative(publicRoot, finalAudio).split(sep).join('/');
          spec.captionTimings = relative(publicRoot, timings).split(sep).join('/');
          this.recordArtifact(jobId, finalAudio, 'audio', null, 'audio/wav');
          this.recordArtifact(
            jobId,
            timings,
            'word-timings',
            null,
            'application/json',
          );
          await this.event(
            jobId,
            'tts',
            'info',
            `Using uploaded narration “${narration.label}” without voice synthesis.`,
            0.27,
          );
        } else if (
          job.provider === 'f5tts' ||
          job.provider === 'indicf5' ||
          job.provider === 'elevenlabs' ||
          job.provider === 'chatterbox'
        ) {
          const versionId = snapshot.variant.voiceProfileVersionId;
          if (!versionId) {
            throw new Error('The localized variant has no voice profile.');
          }
          const selected = await this.repository.voiceProfileForProduction(
            versionId,
            snapshot.variant.locale,
          );
          const clipsRoot = join(generatedRoot, 'scenes');
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
            if (job.provider === 'chatterbox') {
              await this.localVoice.synthesize({
                text: scene.narration,
                referencePath: selected.samplePath,
                outputPath: clip,
              });
            } else if (job.provider === 'elevenlabs') {
              await this.cloudVoice.synthesize({
                text: scene.narration,
                voiceId: selected.version.model,
                outputPath: clip,
                speed: voice.speed,
              });
            } else {
              await this.ai.synthesize({
                text: scene.narration,
                locale: snapshot.variant.locale,
                referencePath: selected.samplePath,
                referenceTranscript: selected.sample.transcript,
                outputPath: clip,
                speed: voice.speed,
                engine:
                  job.provider === 'f5tts' && snapshot.variant.locale === 'en-US'
                    ? 'f5tts'
                    : 'indicf5',
              });
            }
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
            const paddedClip = join(
              clipsRoot,
              `${String(index).padStart(3, '0')}-padded.wav`,
            );
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
            concatLines.push(
              `file '${paddedClip.replaceAll("'", "'\\''")}'`,
            );
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
              finalAudio,
            ],
            paths.root,
            active,
          );
          writeFileSync(
            timings,
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
          writeFileSync(captionsPath, captionsFor(spec));
          const audioRelative = relative(publicRoot, finalAudio)
            .split(sep)
            .join('/');
          const timingRelative = relative(publicRoot, timings)
            .split(sep)
            .join('/');
          spec.audio = audioRelative;
          spec.captionTimings = timingRelative;
          this.recordArtifact(jobId, finalAudio, 'audio', null, 'audio/wav');
          this.recordArtifact(
            jobId,
            timings,
            'word-timings',
            null,
            'application/json',
          );
        } else {
        const speechMap = join(generatedRoot, 'speech-map.json');
        const spokenNarrations = narrationSpeechMap(
          spec.scenes
            .filter((scene) => Boolean(scene.narration?.trim()))
            .map((scene) => scene.narration!.trim()),
        );
        writeFileSync(speechMap, `${JSON.stringify(spokenNarrations, null, 2)}\n`);
        const cacheKey = createHash('sha256')
          .update(
            JSON.stringify({
              srt: readFileSync(captionsPath, 'utf8'),
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
          copyFileSync(cachedAudio, finalAudio);
          copyFileSync(cachedTimings, timings);
          await this.event(jobId, 'tts', 'info', 'Reused the matching cached voice track.', 0.27);
        } else {
          const ttsArguments = [
            fromRoot('scripts/local-tts-from-srt.py'),
            '--srt',
            captionsPath,
            '--out',
            rawAudio,
            '--voice',
            voice.preset,
            '--speed',
            String(voice.speed),
            '--model',
            voice.model,
            '--language',
            languageForVoice(snapshot.variant.locale, voice.language),
            '--timings',
            timings,
            '--speech-map',
            speechMap,
          ];
          if (voice.maxSpeed !== undefined) {
            ttsArguments.push('--max-speed', String(voice.maxSpeed));
          }
          await runProcess(
            pythonExecutable(),
            ttsArguments,
            paths.root,
            active,
          );
          await runProcess(
            'ffmpeg',
            [
              '-y',
              '-hide_banner',
              '-loglevel',
              'error',
              '-i',
              rawAudio,
              '-af',
              `loudnorm=I=${voice.targetLufs}:TP=${voice.truePeakDb}:LRA=${voice.loudnessRange}`,
              finalAudio,
            ],
            paths.root,
            active,
          );
          copyFileSync(finalAudio, cachedAudio);
          copyFileSync(timings, cachedTimings);
        }
        const audioRelative = relative(publicRoot, finalAudio).split(sep).join('/');
        const timingRelative = relative(publicRoot, timings).split(sep).join('/');
        spec.audio = audioRelative;
        spec.captionTimings = timingRelative;
        this.recordArtifact(jobId, finalAudio, 'audio', null, 'audio/wav');
        this.recordArtifact(jobId, timings, 'word-timings', null, 'application/json');
        }
      } else {
        await this.event(
          jobId,
          'tts',
          'info',
          musicOnly
            ? `Using “${spec.soundtrack!.music!.credit}” as the primary audio; TTS and spoken captions were skipped.`
            : 'Voice generation was skipped.',
          0.27,
        );
      }

      await this.stage(
        jobId,
        'timestamps',
        0.3,
        musicOnly
          ? 'No spoken timestamps are required for this music-led video.'
          : 'Locking word and sentence timestamps to the generated audio.',
      );
      let timingData: WordTimingFile | null = null;
      if (!musicOnly) {
        let timingSource: string | null = existsSync(timingsPath)
          ? timingsPath
          : null;
        if (!timingSource && spec.captionTimings) {
          const requested = resolve(publicRoot, spec.captionTimings);
          if (requested.startsWith(`${publicRoot}${sep}`) && existsSync(requested)) {
            timingSource = requested;
          }
        }
        if (timingSource) {
          const parsed = JSON.parse(readFileSync(timingSource, 'utf8')) as WordTimingFile;
          if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.cues)) {
            throw new Error('The narration timing file is invalid.');
          }
          timingData = parsed;
        }
      }

      await this.stage(
        jobId,
        'timeline',
        0.34,
        'Building the single frame-accurate master timeline.',
      );
      const mastered = buildMasterTimeline({
        spec,
        timings: timingData,
        locale: snapshot.variant.locale,
        audioMode: musicOnly
          ? 'music-only'
          : spec.audio
            ? 'voiceover'
            : 'silent',
      });
      spec = mastered.spec;
      const masterTimelinePath = join(artifactRoot, 'master-timeline.json');
      writeFileSync(
        masterTimelinePath,
        `${JSON.stringify(mastered.timeline, null, 2)}\n`,
      );
      this.recordArtifact(
        jobId,
        masterTimelinePath,
        'master-timeline',
        null,
        'application/json',
      );

      await this.stage(
        jobId,
        'composition',
        0.39,
        'Synchronizing visuals, motion, diagrams, code, captions, highlights, and transitions.',
      );
      if (!musicOnly) {
        writeFileSync(captionsPath, captionsFor(spec));
        this.recordArtifact(
          jobId,
          captionsPath,
          'captions',
          null,
          'application/x-subrip',
        );
      }

      await this.stage(
        jobId,
        'audio',
        0.44,
        spec.audio
          ? 'Mixing narration with music, ducking, and sound effects.'
          : spec.soundtrack?.music
            ? 'Mixing background music and sound effects.'
            : 'No audio track is configured; rendering intentionally silent.',
      );

      await this.stage(
        jobId,
        'render',
        0.48,
        'Producing every requested output from the mastered composition.',
      );
      const variants = variantsFor(spec, snapshot.channel);
      const renderRoot = join(jobRoot, 'renders');
      const produced = await produceVariants({
        spec,
        channel: snapshot.channel,
        variants,
        outDir: renderRoot,
        browser: {
          browserExecutable: config.browserExecutable(),
          chromeMode: config.chromeMode(),
          concurrency: config.renderConcurrency() ?? null,
        },
        cancelSignal: cancellation.cancelSignal,
        onProgress: (variant, fraction) => void (async () => {
          const index = variants.indexOf(variant);
          const overall =
            0.5 + ((index + fraction) / Math.max(1, variants.length)) * 0.3;
          await this.repository.updateJob(jobId, {stage: 'render', progress: overall});
          if (Math.round(fraction * 100) % 10 === 0) this.notify(jobId);
        })(),
      });

      // Artifacts are filed under the job's artifact root so downloads keep
      // working; the delivery id is still written where a variant stands in for
      // one, so rows created before the variant registry stay comparable.
      for (const artifact of produced) {
        const packaged = join(artifactRoot, relative(renderRoot, artifact.path));
        mkdirSync(dirname(packaged), {recursive: true});
        copyFileSync(artifact.path, packaged);
        const variant = OUTPUT_VARIANTS[artifact.variantId];
        this.recordArtifact(
          jobId,
          packaged,
          artifact.kind,
          variant?.legacyDeliveryId ?? null,
          artifact.mimeType,
        );
      }

      await this.stage(jobId, 'qa', 0.84, 'Checking duration, streams, audio, and generated artifacts.');
      // Voice generation and uploaded narration may legitimately retime scenes.
      // QA must compare against the immutable spec actually rendered, not the
      // pre-voice storyboard duration captured at validation time.
      const expectedDurationSeconds =
        spec.scenes.reduce(
          (sum, scene) => sum + scene.durationInFrames,
          0,
        ) / (spec.fps ?? 30);
      const requireAudio = Boolean(
        spec.audio || spec.soundtrack?.music || spec.soundtrack?.effects?.length,
      );
      for (const artifact of await this.repository.listArtifacts(jobId)) {
        const path = await this.repository.artifactPath(artifact.id);
        if (!existsSync(path) || statSync(path).size === 0) {
          throw new Error(`Generated artifact is empty: ${artifact.filename}`);
        }
        if (artifact.kind === 'video') {
          await runProcess(
            process.execPath,
            [
              fromRoot('scripts/media-qa.mjs'),
              path,
              '--expected',
              String(expectedDurationSeconds),
              ...(requireAudio ? ['--require-audio'] : []),
            ],
            paths.root,
            active,
          );
        }
      }

      await this.stage(jobId, 'package', 0.93, 'Writing the production manifest and download package.');
      const currentArtifacts = await this.repository.listArtifacts(jobId);
      const manifestPath = join(artifactRoot, 'manifest.json');
      writeFileSync(
        manifestPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            jobId,
            projectId: job.projectId,
            revisionId: job.revisionId,
            title: spec.title,
            locale: snapshot.variant.locale,
            translationStatus: snapshot.variant.translationStatus,
            audioMode: musicOnly ? 'music-only' : 'voiceover',
            music: spec.soundtrack?.music ?? null,
            syntheticVoice: Boolean(
              job.generateVoice && snapshot.variant.voiceProfileVersionId,
            ),
            voiceProvider: job.provider,
            voiceProfileVersionId:
              snapshot.variant.voiceProfileVersionId ?? null,
            narrationAssetId: snapshot.variant.narrationAssetId ?? null,
            createdAt: new Date().toISOString(),
            artifacts: currentArtifacts,
          },
          null,
          2,
        )}\n`,
      );
      this.recordArtifact(jobId, manifestPath, 'manifest', null, 'application/json');
      const packagePath = join(artifactRoot, 'video-package.zip');
      const packageFiles = await Promise.all(
        (await this.repository.listArtifacts(jobId)).map((artifact) =>
          this.repository.artifactPath(artifact.id),
        ),
      );
      await runProcess(
        'zip',
        ['-j', packagePath, ...packageFiles],
        paths.root,
        active,
      );
      this.recordArtifact(
        jobId,
        packagePath,
        'package',
        null,
        'application/zip',
      );

      const completedAt = new Date().toISOString();
      await this.repository.updateJob(jobId, {
        status: 'completed',
        stage: 'completed',
        progress: 1,
        completedAt,
      });
      await this.event(jobId, 'completed', 'info', 'All requested outputs are ready.', 1);
    } catch (error) {
      const current = await this.repository.getJob(jobId);
      const cancelled =
        current.status === 'cancelled' ||
        /SIGTERM|cancel/i.test(safeError(error));
      const message = cancelled ? 'Job cancelled.' : safeError(error);
      await this.repository.updateJob(jobId, {
        status: cancelled ? 'cancelled' : 'failed',
        error: message,
        completedAt: new Date().toISOString(),
      });
      await this.event(
        jobId,
        current.stage,
        cancelled ? 'info' : 'error',
        message,
        current.progress,
      );
    } finally {
      this.active.delete(jobId);
      this.notify(jobId);
    }
  }

  private async runTranslation(jobId: string) {
    const job = await this.repository.getJob(jobId);
    const target = await this.repository.getVariant(job.projectId, job.variantId);
    if (!target.sourceVariantId) {
      throw new Error('Translation target has no source variant.');
    }
    const source = await this.repository.getVariant(
      job.projectId,
      target.sourceVariantId,
    );
    const units = await this.repository.listTranslationUnits(target.id);
    if (!units.length) throw new Error('Translation target has no text units.');
    await this.stage(
      jobId,
      'translation',
      0.1,
      `Translating ${units.length} fields from ${source.locale} to ${target.locale}.`,
    );
    const glossary = await this.repository.listGlossary(job.projectId);
    const preserved = glossary
      .filter((entry) => entry.mode === 'preserve')
      .map((entry) => entry.sourceTerm);
    const protectedUnits = units.map((unit) =>
      protectTerms(unit.sourceText, preserved),
    );
    const result = await this.ai.translate({
      texts: protectedUnits.map((entry) => entry.text),
      sourceLocale: source.locale,
      targetLocale: target.locale,
    });
    if (result.translations.length !== units.length) {
      throw new Error('Translation provider returned an incomplete result.');
    }
    const translated = units.map((unit, index) => {
      let value = protectedUnits[index].restore(result.translations[index]);
      for (const entry of glossary.filter(
        (item) => item.mode === 'translate' && item.translatedTerm,
      )) {
        value = value.replaceAll(entry.sourceTerm, entry.translatedTerm!);
      }
      return {
        unitId: unit.id,
        translatedText: value,
        pivotText: result.pivots[index] ?? null,
      };
    });
    await this.repository.applyTranslationResults(
      job.projectId,
      target.id,
      translated,
    );
    const completedAt = new Date().toISOString();
    await this.repository.updateJob(jobId, {
      status: 'completed',
      stage: 'completed',
      progress: 1,
      completedAt,
    });
    await this.event(
      jobId,
      'completed',
      'info',
      'Translation draft is ready for review.',
      1,
    );
  }

  private async recordArtifact(
    jobId: string,
    path: string,
    kind: string,
    deliveryId: string | null,
    mimeType: string,
  ) {
    const resolved = resolve(path);
    const allowed = join(paths.jobs(), jobId);
    const generated = join(paths.generated(), jobId);
    if (
      resolved !== allowed &&
      !resolved.startsWith(`${allowed}${sep}`) &&
      resolved !== generated &&
      !resolved.startsWith(`${generated}${sep}`)
    ) {
      throw new Error('Artifact path escaped the managed job directories.');
    }
    const stats = statSync(resolved);
    await this.repository.addArtifact(jobId, {
      kind,
      deliveryId,
      filename: resolved.split(sep).at(-1)!,
      path: resolved,
      mimeType,
      sizeBytes: stats.size,
      checksum: checksum(resolved),
    });
  }
}
