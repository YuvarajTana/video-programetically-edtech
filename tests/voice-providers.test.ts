import assert from 'node:assert/strict';
import test from 'node:test';
import {VoiceProviderSchema} from '@video-kit/core/contracts';
import {VOICE_PROVIDERS, voiceProviderFor} from '@video-kit/backend/voice';

test('every provider the contracts allow is registered', () => {
  assert.deepEqual(
    Object.keys(VOICE_PROVIDERS).sort(),
    [...VoiceProviderSchema.options].sort(),
    'a voice provider exists in the contract but not in the registry',
  );
});

test('each registration answers to its own id', () => {
  for (const [id, provider] of Object.entries(VOICE_PROVIDERS)) {
    assert.equal(provider.id, id, `${id} is registered under the wrong key`);
    assert.equal(typeof provider.synthesize, 'function');
  }
});

test('a job with no provider falls back to the default local voice', () => {
  assert.equal(voiceProviderFor(undefined).id, 'kokoro');
  assert.equal(voiceProviderFor(null).id, 'kokoro');
  assert.equal(voiceProviderFor('chatterbox').id, 'chatterbox');
  assert.equal(voiceProviderFor('uploaded').id, 'uploaded');
});
