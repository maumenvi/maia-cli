import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { searchCatalog } from '../../src/agent/catalog/providers/core/search-catalog.ts';
import { createDefaultManifest } from '../../src/agent/catalog/manifest/defaults.ts';

describe('searchCatalog', () => {
  it('returns results with no failures when all providers respond', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => Response.json({
        skills: [{ id: 'a/b/c', skillId: 'c', name: 'C', source: 'a/b' }],
      });

      const manifest = createDefaultManifest();
      manifest.registries = {
        'skills.sh': { provider: 'skills.sh', url: 'https://skills.sh' },
      };

      const outcome = await searchCatalog(manifest, 'skill', 'c', 10);

      assert.equal(outcome.results.length, 1);
      assert.deepEqual(outcome.failures, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('reports a failure for a rejecting provider while returning results from another', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('down.example')) {
          throw new Error('network down');
        }
        return Response.json({
          skills: [{ id: 'a/b/c', skillId: 'c', name: 'C', source: 'a/b' }],
        });
      };

      const manifest = createDefaultManifest();
      manifest.registries = {
        'broken-registry': { provider: 'skills.sh', url: 'https://down.example' },
        'skills.sh': { provider: 'skills.sh', url: 'https://skills.sh' },
      };

      const outcome = await searchCatalog(manifest, 'skill', 'c', 10);

      assert.equal(outcome.results.length, 1);
      assert.equal(outcome.failures.length, 1);
      assert.equal(outcome.failures[0]?.providerId, 'broken-registry');
      assert.equal(outcome.failures[0]?.kind, 'skill');
      assert.match(outcome.failures[0]?.message ?? '', /network down/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('reports a failure per provider when all providers reject', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error('all down');
      };

      const manifest = createDefaultManifest();
      manifest.registries = {
        'skills.sh': { provider: 'skills.sh', url: 'https://skills.sh' },
      };

      const outcome = await searchCatalog(manifest, 'skill', 'c', 10);

      assert.deepEqual(outcome.results, []);
      assert.equal(outcome.failures.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns empty results and failures when no provider is configured for the kind', async () => {
    const manifest = createDefaultManifest();
    manifest.registries = {};

    const outcome = await searchCatalog(manifest, 'skill', 'anything', 10);

    assert.deepEqual(outcome.results, []);
    assert.deepEqual(outcome.failures, []);
  });
});
