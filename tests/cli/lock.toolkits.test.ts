import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { SPECKIT_TOOLKIT } from '../../src/agent/toolkits/catalog/speckit.ts';
import { assertLockfileVersionCompatible } from '../../src/cli/commands/assert.lockfile.version.compatible.ts';

/** Runs `body` against a fresh project directory. */
function withProject(body: (store: AgentCatalogStore, dir: string) => void, catalog = [SPECKIT_TOOLKIT]): void {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-lock-toolkits-'));
  try {
    const store = new AgentCatalogStore({ cwd: dir, toolkitCatalog: catalog });
    store.saveManifest(store.loadManifest());
    body(store, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('lock with toolkits', () => {
  it('keeps version 1 and no toolkits section when the manifest has none', () => {
    withProject((store) => {
      const lock = store.buildLock();
      assert.equal(lock.lockfileVersion, 1);
      assert.equal('toolkits' in lock, false);
      assert.deepEqual(store.loadManifest().toolkits, {});
    });
  });

  it('pins toolkits and bumps to version 2', () => {
    withProject((store) => {
      store.saveSelectedAgents(['claude']);
      store.setToolkit('speckit', { version: '1.0.11', scope: 'project' });
      const lock = store.buildLock();
      assert.equal(lock.lockfileVersion, 2);
      assert.deepEqual(lock.toolkits?.speckit, {
        name: 'speckit',
        version: '1.0.11',
        scope: 'project',
        source: 'https://github.com/github/spec-kit',
        ref: 'v1.0.11',
        integrations: ['claude'],
        paths: ['.specify', '.claude/skills/speckit-*'],
      });
      assert.deepEqual(store.loadLock()?.toolkits?.speckit?.version, '1.0.11');
    });
  });

  it('drops the toolkit and returns to version 1 when it is removed', () => {
    withProject((store) => {
      store.setToolkit('speckit', { version: '1.0.11', scope: 'project' });
      store.buildLock();
      store.removeToolkit('speckit');
      assert.equal(store.buildLock().lockfileVersion, 1);
      assert.deepEqual(store.loadManifest().toolkits, {});
    });
  });

  it('fails for a toolkit outside the catalog, using the store catalog', () => {
    withProject((store) => {
      store.setToolkit('speckit', { version: '1.0.11', scope: 'project' });
      assert.throws(() => store.buildLock(), /Unknown toolkit "speckit"/);
    }, []);
  });

  it('accepts lockfile versions 1 and 2 only', () => {
    assert.doesNotThrow(() => assertLockfileVersionCompatible(1));
    assert.doesNotThrow(() => assertLockfileVersionCompatible(2));
    assert.throws(() => assertLockfileVersionCompatible(3), /supports \(1, 2\)/);
  });
});
