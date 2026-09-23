import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isManifestSchemaCompatible } from '../../src/agent/catalog/manifest/schema/is.manifest.schema.compatible.ts';

describe('isManifestSchemaCompatible', () => {
  it('returns true when the manifest version is satisfied by the supported range', () => {
    assert.equal(isManifestSchemaCompatible('^1.0.0', '^1.0.0'), true);
    assert.equal(isManifestSchemaCompatible('1.2.3', '^1.0.0'), true);
  });

  it('returns false when the manifest version is older than the supported range', () => {
    assert.equal(isManifestSchemaCompatible('^0.5.0', '^1.0.0'), false);
  });

  it('returns false when the manifest version is newer than the supported range', () => {
    assert.equal(isManifestSchemaCompatible('^99.0.0', '^1.0.0'), false);
    assert.equal(isManifestSchemaCompatible('^2.0.0', '^1.0.0'), false);
  });
});
