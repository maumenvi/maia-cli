import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDefaultManifest } from '../../src/agent/catalog/manifest/defaults.ts';
import { hasStaleLocalSourceRef } from '../../src/agent/catalog/manifest/migrate/has.stale.local.source.ref.ts';
import type { CatalogSource } from '../../src/agent/catalog/types/source/catalog.source.ts';

const withSources = (sources: Record<string, CatalogSource>) => ({ ...createDefaultManifest(), sources });
const local = (overrides: Partial<CatalogSource> = {}) => ({
  type: 'registry',
  url: 'npm:@maumenvi/maia-cli',
  ref: '1.5.2',
  trusted: true,
  ...overrides,
}) as CatalogSource;

describe('hasStaleLocalSourceRef', () => {
  it('detects the unpublished 1.5.2 ref on the Maia local source', () => {
    assert.equal(hasStaleLocalSourceRef(withSources({ local: local() })), true);
  });

  it('ignores any other ref', () => {
    assert.equal(hasStaleLocalSourceRef(withSources({ local: local({ ref: '1.5.7' }) })), false);
  });

  it('ignores a local source pointing elsewhere', () => {
    assert.equal(hasStaleLocalSourceRef(withSources({ local: local({ url: 'npm:other' }) })), false);
  });

  it('ignores a local source of another type', () => {
    assert.equal(
      hasStaleLocalSourceRef(withSources({ local: local({ type: 'git', url: 'https://github.com/x/y' }) })),
      false,
    );
  });

  it('ignores manifests without a local source', () => {
    assert.equal(hasStaleLocalSourceRef(withSources({})), false);
  });

  it('ignores 1.5.2 on other sources', () => {
    assert.equal(hasStaleLocalSourceRef(withSources({ skillsHub: local() })), false);
  });
});
