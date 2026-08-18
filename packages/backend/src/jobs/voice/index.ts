import type {VoiceProvider as VoiceProviderId} from '@video-kit/core/contracts';
import {kokoroVoiceProvider} from './kokoro';
import {
  chatterboxVoiceProvider,
  elevenLabsVoiceProvider,
  f5ttsVoiceProvider,
  indicF5VoiceProvider,
} from './per-scene';
import {uploadedVoiceProvider} from './uploaded';
import type {VoiceProvider} from './types';

/**
 * Every way narration can be produced.
 *
 * Adding one is a module here plus an entry — the job runner asks the registry
 * rather than branching on the provider id. Note the repository decides which
 * of these a job may actually request (createJob rejects the cloned cloud and
 * Indic providers today), so registration alone does not make one reachable.
 */
export const VOICE_PROVIDERS: Record<VoiceProviderId, VoiceProvider> = {
  kokoro: kokoroVoiceProvider,
  uploaded: uploadedVoiceProvider,
  chatterbox: chatterboxVoiceProvider,
  elevenlabs: elevenLabsVoiceProvider,
  f5tts: f5ttsVoiceProvider,
  indicf5: indicF5VoiceProvider,
};

export const voiceProviderFor = (
  id: VoiceProviderId | null | undefined,
): VoiceProvider =>
  VOICE_PROVIDERS[id ?? 'kokoro'] ?? kokoroVoiceProvider;

export type {VoiceContext, VoiceProvider, VoiceResult} from './types';
