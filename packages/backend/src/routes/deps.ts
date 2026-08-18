import type {Repository} from '@video-kit/datasource';
import type {LocalAiWorker} from '../local-ai';
import type {ChatterboxVoiceWorker} from '../local-voice';
import type {ElevenLabsVoiceProvider} from '../elevenlabs';
import type {ScriptGenerator} from '../openai-script';
import type {JobRunner} from '../pipeline';

/**
 * What every route group is handed. Passing these explicitly is what lets the
 * API be assembled from plugins instead of one 700-line factory, and is the
 * same seam the tests already use to inject fakes.
 */
export type RouteDeps = {
  repository: Repository;
  runner: JobRunner;
  ai: LocalAiWorker;
  cloudVoice: ElevenLabsVoiceProvider;
  localVoice: ChatterboxVoiceWorker;
  scriptGenerator: ScriptGenerator;
};
