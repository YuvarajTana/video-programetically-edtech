import {existsSync, statSync} from 'node:fs';
import {fromRoot, paths} from '@video-kit/core/config';
import {runProcess} from '../process';
import type {JobContext} from '../context';

/**
 * Check what was produced before packaging it.
 *
 * Durations are compared against the spec that was actually rendered, not the
 * storyboard captured at validation: voice generation and uploaded narration
 * both legitimately retime scenes.
 */
export const runQaStage = async (context: JobContext) => {
  const {jobId, spec, repository, active} = context;
  await context.stage(
    'qa',
    0.84,
    'Checking duration, streams, audio, and generated artifacts.',
  );

  const expectedDurationSeconds =
    spec.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) /
    (spec.fps ?? 30);
  const requireAudio = Boolean(
    spec.audio || spec.soundtrack?.music || spec.soundtrack?.effects?.length,
  );

  for (const artifact of await repository.listArtifacts(jobId)) {
    const path = await repository.artifactPath(artifact.id);
    if (!existsSync(path) || statSync(path).size === 0) {
      throw new Error(`Generated artifact is empty: ${artifact.filename}`);
    }
    if (artifact.kind !== 'video') continue;
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
};
