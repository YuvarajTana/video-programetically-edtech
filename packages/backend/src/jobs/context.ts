import type {CancelSignal} from '@remotion/renderer';
import type {JobRecord, JobStage, RenderSnapshot} from '@video-kit/core/contracts';
import type {VideoSpec} from '@video-kit/core/spec';
import type {Repository} from '@video-kit/datasource';
import type {ActiveJob} from './process';

/**
 * What every stage of a production job shares.
 *
 * `spec` is a mutable slot rather than a value because the stages genuinely
 * mutate it: music-only strips narration in place, voice synthesis retimes
 * scenes to the audio it produced, and the timeline stage replaces the object
 * outright with its mastered form.
 */
export type JobContext = {
  jobId: string;
  job: JobRecord;
  snapshot: RenderSnapshot;
  spec: VideoSpec;
  repository: Repository;
  active: ActiveJob;
  cancelSignal: CancelSignal;
  dirs: {
    jobRoot: string;
    artifactRoot: string;
    publicRoot: string;
    generatedRoot: string;
  };
  files: {captionsPath: string; timingsPath: string};
  /** True when the video is carried by music rather than narration. */
  musicOnly: boolean;

  /** Advance the job to a stage and report it. */
  stage: (stage: JobStage, progress: number, message: string) => Promise<void>;
  /** Report something within the current stage. */
  event: (
    stage: JobStage,
    level: 'info' | 'warn' | 'error',
    message: string,
    progress: number,
  ) => Promise<void>;
  /** Record a produced file against the job. Always await: QA reads these back. */
  recordArtifact: (
    path: string,
    kind: string,
    deliveryId: string | null,
    mimeType: string,
  ) => Promise<void>;
  /** Advisory progress within a stage, coalesced and never blocking. */
  reportProgress: (stage: JobStage, progress: number, notify: boolean) => void;
};
