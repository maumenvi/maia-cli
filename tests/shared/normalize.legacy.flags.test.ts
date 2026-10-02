import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeLegacyFlags } from '../../src/cli/shared/flags/normalize.legacy.flags.ts';

describe('normalizeLegacyFlags', () => {
  it('maps -env-g and --env-global to --env-g', () => {
    assert.deepEqual(normalizeLegacyFlags(['x', '-env-g']), ['x', '--env-g']);
    assert.deepEqual(normalizeLegacyFlags(['--env-global', 'x']), ['--env-g', 'x']);
  });

  it('leaves everything else alone', () => {
    assert.deepEqual(normalizeLegacyFlags(['--env-g', '-g', 'name']), ['--env-g', '-g', 'name']);
  });
});
