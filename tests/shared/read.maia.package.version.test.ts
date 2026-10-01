import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readMaiaPackageVersion } from '../../src/shared/package/read.maia.package.version.ts';
import { ROOT_PACKAGE_VERSION } from '../support/root.package.version.ts';

describe('readMaiaPackageVersion', () => {
  it('reads the version declared in package.json', () => {
    assert.equal(readMaiaPackageVersion(), ROOT_PACKAGE_VERSION);
  });

  it('returns the same value on repeated calls', () => {
    assert.equal(readMaiaPackageVersion(), readMaiaPackageVersion());
  });
});
