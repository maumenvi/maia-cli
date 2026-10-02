import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDefaultManifest } from '../../src/agent/catalog/manifest/defaults.ts';
import type { SourcesManifest } from '../../src/agent/catalog/types/manifest/sources.manifest.ts';
import { resolveEffectiveTrust } from '../../src/cli/install/external/resolve.effective.trust.ts';

const manifestWith = (trusted?: boolean): SourcesManifest => {
  const sources: SourcesManifest['sources'] = {};
  if (trusted !== undefined) sources.hub = { type: 'git', url: 'https://github.com/a/b.git', trusted };
  return { ...createDefaultManifest(), sources };
};

describe('resolveEffectiveTrust', () => {
  it('keeps the trust the user declared for an existing source', () => {
    assert.equal(resolveEffectiveTrust(manifestWith(true), 'hub', false), true);
    assert.equal(resolveEffectiveTrust(manifestWith(false), 'hub', true), false);
  });

  it('uses the resolved trust for a new source', () => {
    assert.equal(resolveEffectiveTrust(manifestWith(), 'hub', false), false);
    assert.equal(resolveEffectiveTrust(manifestWith(), 'hub', true), true);
  });
});
