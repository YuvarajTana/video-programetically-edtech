import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadSpecs} from '../scripts/spec-loader.mjs';
import {validateCollection} from '../scripts/validation-lib.mjs';

/**
 * Every registered spec — production and style guide — must validate with zero
 * errors, so a broken registry entry fails CI before anyone renders it.
 */
test('all registered specs validate cleanly', async () => {
  const entries = await loadSpecs({includeStyleGuides: true});
  assert.ok(entries.length >= 12, `expected registries to load, got ${entries.length}`);

  const results = validateCollection(entries);
  const failures = results
    .map((result) => ({
      ref: result.ref,
      errors: result.issues.filter((issue) => issue.severity === 'error'),
    }))
    .filter((result) => result.errors.length);
  assert.deepEqual(failures, []);
});
