import type {JobRecord, RenderSnapshot, VoiceProvider as VoiceProviderId} from '@video-kit/core/contracts';
import type {VideoSpec} from '@video-kit/core/spec';
import type {Repository} from '@video-kit/datasource';
import type {LocalAiWorker} from '../../local-ai';
import type {ChatterboxVoiceWorker} from '../../local-voice';
import type {ElevenLabsVoiceProvider} from '../../elevenlabs';
import type {ActiveJob} from '../process';

/** Everything a provider needs to turn an approved script into a master track. */
export type VoiceContext = {
  job: JobRecord;
  snapshot: RenderSnapshot;
  /** Mutable: per-scene providers retime scenes to the audio they produced. */
  spec: VideoSpec;
  repository: Repository;
  active: ActiveJob;
  workers: {
    ai: LocalAiWorker;
    cloudVoice: ElevenLabsVoiceProvider;
    localVoice: ChatterboxVoiceWorker;
  };
  files: {
    generatedRoot: string;
    publicRoot: string;
    captionsPath: string;
    timingsPath: string;
    rawAudio: string;
    finalAudio: string;
  };
  event: (message: string, progress: number) => Promise<void>;
};

export type VoiceResult = {
  /** Reported once the track and its artifacts are recorded. */
  note?: string;
};

/**
 * One way of producing narration.
 *
 * Providers fall into two shapes: whole-track ones that emit a finished master
 * in a single step, and per-scene ones that synthesize clip by clip and share
 * the measure/pad/concat/loudnorm assembly. Both satisfy this interface; the
 * shared assembly lives in ./per-scene.
 */
export type VoiceProvider = {
  id: VoiceProviderId;
  synthesize: (context: VoiceContext) => Promise<VoiceResult>;
};
