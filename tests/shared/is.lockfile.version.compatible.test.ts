import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isLockfileVersionCompatible } from '../../src/agent/catalog/lock/schema/is.lockfile.version.compatible.ts';

describe('isLockfileVersionCompatible', () => {
  it('accepts a lockfile whose version matches the supported one', () => {
    assert.equal(isLockfileVersionCompatible(1, [1, 2]), true);
    assert.equal(isLockfileVersionCompatible(2, [1, 2]), true);
  });

  it('rejects a lockfile newer than the supported version', () => {
    assert.equal(isLockfileVersionCompatible(3, [1, 2]), false);
    assert.equal(isLockfileVersionCompatible(99, [1, 2]), false);
  });

  it('rejects a lockfile older than the supported version', () => {
    assert.equal(isLockfileVersionCompatible(0, [1, 2]), false);
  });
});
