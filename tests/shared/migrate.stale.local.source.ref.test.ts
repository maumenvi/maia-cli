import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDefaultManifest } from '../../src/agent/catalog/manifest/defaults.ts';
import { migrateStaleLocalSourceRef } from '../../src/agent/catalog/manifest/migrate/migrate.stale.local.source.ref.ts';
import type { SourcesManifest } from '../../src/agent/catalog/types/manifest/sources.manifest.ts';

const manifestWithLocalRef = (ref: string): SourcesManifest => ({
  ...createDefaultManifest(),
  sources: {
    local: { type: 'registry', url: 'npm:@maumenvi/maia-cli', ref, trusted: true },
    skillsHub: { type: 'git', url: 'https://github.com/vercel-labs/skills', ref: 'main', trusted: true },
  },
});

describe('migrateStaleLocalSourceRef', () => {
  it('replaces only the stale local ref without mutating the input', () => {
    const manifest = manifestWithLocalRef('1.5.2');
    const snapshot = structuredClone(manifest);

    const migrated = migrateStaleLocalSourceRef(manifest, '1.6.2');

    assert.deepEqual(migrated.sources.local, { type: 'registry', url: 'npm:@maumenvi/maia-cli', ref: '1.6.2', trusted: true });
    assert.deepEqual(migrated.sources.skillsHub, manifest.sources.skillsHub);
    assert.deepEqual(manifest, snapshot);
  });

  it('returns the same manifest when the ref is not stale', () => {
    const manifest = manifestWithLocalRef('1.5.7');
    assert.equal(migrateStaleLocalSourceRef(manifest, '1.6.2'), manifest);
  });
});
