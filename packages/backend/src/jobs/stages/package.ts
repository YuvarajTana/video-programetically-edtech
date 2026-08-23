import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {paths} from '@video-kit/core/config';
import {runProcess} from '../process';
import type {JobContext} from '../context';

/**
 * Write the manifest and zip everything the job produced.
 *
 * The artifact list is read twice on purpose: once for the manifest's contents,
 * and again for the zip, so the manifest itself is included in the package.
 */
export const runPackageStage = async (context: JobContext) => {
  const {jobId, job, snapshot, spec, repository, active, dirs, musicOnly} = context;
  await context.stage(
    'package',
    0.93,
    'Writing the production manifest and download package.',
  );

  const currentArtifacts = await repository.listArtifacts(jobId);
  const manifestPath = join(dirs.artifactRoot, 'manifest.json');
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
        voiceProfileVersionId: snapshot.variant.voiceProfileVersionId ?? null,
        narrationAssetId: snapshot.variant.narrationAssetId ?? null,
        createdAt: new Date().toISOString(),
        artifacts: currentArtifacts,
      },
      null,
      2,
    )}\n`,
  );
  await context.recordArtifact(manifestPath, 'manifest', null, 'application/json');

  const packagePath = join(dirs.artifactRoot, 'video-package.zip');
  const packageFiles = await Promise.all(
    (await repository.listArtifacts(jobId)).map((artifact) =>
      repository.artifactPath(artifact.id),
    ),
  );
  await runProcess('zip', ['-j', packagePath, ...packageFiles], paths.root, active);
  await context.recordArtifact(packagePath, 'package', null, 'application/zip');
};
