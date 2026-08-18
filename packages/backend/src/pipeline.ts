import {makeCancelSignal} from '@remotion/renderer';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {captionsFor, configureMusicOnlySpec} from './jobs/captions';
import {voiceProviderFor} from './jobs/voice';
import {
  checksum,
  runProcess,
  safeError,
  type ActiveJob,
} from './jobs/process';
import {EditableVideoSpecSchema, type JobStage} from '@video-kit/core/contracts';
import {OUTPUT_VARIANTS, variantsFor} from '@video-kit/core/output';
import {config, fromRoot, paths} from '@video-kit/core/config';
import {produceVariants} from '@video-kit/render-engine';
import {
  buildMasterTimeline,
  type WordTimingFile,
} from '@video-kit/core/master-timeline';
import {protectTerms} from '@video-kit/core/localization';
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

export {captionsFor, configureMusicOnlySpec} from './jobs/captions';

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
      let spec: VideoSpec = EditableVideoSpecSchema.parse(snapshot.spec);
      const approvedScriptPath = join(artifactRoot, 'approved-script.txt');
      writeFileSync(
        approvedScriptPath,
        `${spec.scenes
          .map((scene) => scene.narration?.trim())
          .filter(Boolean)
          .join('\n\n')}\n`,
      );
      await this.recordArtifact(
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
      await this.recordArtifact(
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
        const files = {
          generatedRoot,
          publicRoot,
          captionsPath,
          timingsPath,
          rawAudio: join(generatedRoot, 'master-raw.wav'),
          finalAudio: join(generatedRoot, 'master.wav'),
        };
        const provider = voiceProviderFor(job.provider);
        const {note} = await provider.synthesize({
          job,
          snapshot,
          spec,
          repository: this.repository,
          active,
          workers: {ai: this.ai, cloudVoice: this.cloudVoice, localVoice: this.localVoice},
          files,
          event: (message, progress) =>
            this.event(jobId, 'tts', 'info', message, progress),
        });

        // Every provider leaves a master track and a timings file in the same
        // place, so the spec is pointed at them and they are recorded once here
        // rather than at the end of each provider.
        spec.audio = relative(publicRoot, files.finalAudio).split(sep).join('/');
        spec.captionTimings = relative(publicRoot, files.timingsPath)
          .split(sep)
          .join('/');
        await this.recordArtifact(jobId, files.finalAudio, 'audio', null, 'audio/wav');
        await this.recordArtifact(
          jobId,
          files.timingsPath,
          'word-timings',
          null,
          'application/json',
        );
        if (note) await this.event(jobId, 'tts', 'info', note, 0.27);
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
      await this.recordArtifact(
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
        await this.recordArtifact(
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
      // Progress is advisory, so it must not block rendering — but it also must
      // not pile up unawaited promises against a datasource that is a network
      // call away. One write in flight at a time, latest value wins.
      let progressInFlight = false;
      let pendingProgress: {progress: number; notify: boolean} | null = null;
      const reportProgress = (progress: number, notify: boolean) => {
        pendingProgress = {progress, notify};
        if (progressInFlight) return;
        progressInFlight = true;
        void (async () => {
          try {
            while (pendingProgress) {
              const next = pendingProgress;
              pendingProgress = null;
              await this.repository.updateJob(jobId, {
                stage: 'render',
                progress: next.progress,
              });
              if (next.notify) this.notify(jobId);
            }
          } catch {
            // A dropped progress update must never fail the render.
          } finally {
            progressInFlight = false;
          }
        })();
      };
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
        onProgress: (variant, fraction) => {
          const index = variants.indexOf(variant);
          reportProgress(
            0.5 + ((index + fraction) / Math.max(1, variants.length)) * 0.3,
            Math.round(fraction * 100) % 10 === 0,
          );
        },
      });

      // Artifacts are filed under the job's artifact root so downloads keep
      // working; the delivery id is still written where a variant stands in for
      // one, so rows created before the variant registry stay comparable.
      for (const artifact of produced) {
        const packaged = join(artifactRoot, relative(renderRoot, artifact.path));
        mkdirSync(dirname(packaged), {recursive: true});
        copyFileSync(artifact.path, packaged);
        const variant = OUTPUT_VARIANTS[artifact.variantId];
        await this.recordArtifact(
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
              fromRoot('packages', 'cli', 'src', 'media-qa.mjs'),
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
      await this.recordArtifact(jobId, manifestPath, 'manifest', null, 'application/json');
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
      await this.recordArtifact(
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
