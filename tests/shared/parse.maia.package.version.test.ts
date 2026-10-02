import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseMaiaPackageVersion } from '../../src/shared/package/parse.maia.package.version.ts';

describe('parseMaiaPackageVersion', () => {
  it('returns the declared version', () => {
    assert.equal(parseMaiaPackageVersion('{"version":"1.6.1"}'), '1.6.1');
  });

  it('keeps pre-release versions verbatim', () => {
    assert.equal(parseMaiaPackageVersion('{"version":"1.7.0-beta.1"}'), '1.7.0-beta.1');
  });

  for (const content of ['{}', '{"version":""}', '{"version":1}']) {
    it(`fails clearly for ${content}`, () => {
      assert.throws(() => parseMaiaPackageVersion(content), /package version not found/);
    });
  }
});
