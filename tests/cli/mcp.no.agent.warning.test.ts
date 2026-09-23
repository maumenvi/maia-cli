import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { warnWhenNoAgentConfigured } from '../../src/cli/commands/mcp/warn.when.no.agent.configured.ts';

function withStore<T>(run: (store: AgentCatalogStore) => T): T {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-warn-'));
  try {
    const store = new AgentCatalogStore({ cwd: tempDir });
    store.saveManifest(store.loadManifest());
    return run(store);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('warnWhenNoAgentConfigured', () => {
  it('returns a warning when the manifest has no agents', () => {
    withStore((store) => {
      const warning = warnWhenNoAgentConfigured(store);

      assert.ok(warning, 'an install with no agent must not look fully wired up');
      assert.match(warning ?? '', /add agent/);
    });
  });

  it('returns nothing once an agent is configured', () => {
    withStore((store) => {
      const manifest = store.loadManifest();
      manifest.agents = {
        claude: { id: 'claude', name: 'Claude', enabled: true, addedAt: new Date().toISOString() },
      };
      store.saveManifest(manifest);

      assert.equal(warnWhenNoAgentConfigured(store), undefined);
    });
  });

  it('still warns when an agents map exists but is empty', () => {
    withStore((store) => {
      const manifest = store.loadManifest();
      manifest.agents = {};
      store.saveManifest(manifest);

      assert.ok(warnWhenNoAgentConfigured(store));
    });
  });
});
