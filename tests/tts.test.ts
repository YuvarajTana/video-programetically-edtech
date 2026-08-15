import assert from 'node:assert/strict';
import test from 'node:test';
import {narrationForSpeech} from '../shared/tts';

test('speech normalization makes common Python tokens pronounceable', () => {
  assert.equal(
    narrationForSpeech(
      'Use `@timer`, then define `wrapper(*args, **kwargs)` and return `user_name`.',
    ),
    'Use the timer decorator, then define wrapper(positional arguments, keyword arguments) and return user name.',
  );
});

test('speech normalization does not rewrite normal narration', () => {
  assert.equal(
    narrationForSpeech('Python executes your program from top to bottom.'),
    'Python executes your program from top to bottom.',
  );
});
