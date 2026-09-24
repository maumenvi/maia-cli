import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeToolkitVersion } from '../../src/agent/toolkits/plan/normalize.toolkit.version.ts';
import { parseRequestedVersion } from '../../src/agent/toolkits/plan/parse.requested.version.ts';

describe('parseRequestedVersion', () => {
  it('accepts x.y.z with an optional v prefix', () => {
    assert.equal(parseRequestedVersion('1.0.11'), '1.0.11');
    assert.equal(parseRequestedVersion('v1.0.11'), '1.0.11');
  });

  it('rejects anything else, since the value reaches argv', () => {
    for (const bad of ['abc', '1.0', '1.0.11; rm -rf /', '^1.0.0', '']) {
      assert.throws(() => parseRequestedVersion(bad), /Invalid version/);
    }
  });
});

describe('normalizeToolkitVersion', () => {
  it('reduces to major.minor.patch', () => {
    assert.equal(normalizeToolkitVersion('v1.0.11'), '1.0.11');
    assert.equal(normalizeToolkitVersion('1.0.9.dev0'), '1.0.9');
    assert.equal(normalizeToolkitVersion('1.0.11+abc'), '1.0.11');
    assert.equal(normalizeToolkitVersion('1.0.11-rc.1'), '1.0.11');
    assert.equal(normalizeToolkitVersion('garbage'), null);
  });
});
