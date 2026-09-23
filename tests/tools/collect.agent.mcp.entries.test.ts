import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { collectAgentMcpEntries } from '../../src/agent/agents/inject/collect.agent.mcp.entries.ts';
import { claude } from '../../src/agent/agents/registry/claude.ts';

function withStore<T>(run: (store: AgentCatalogStore) => T): T {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-collect-mcp-entries-'));
  try {
    const store = new AgentCatalogStore({ cwd: tempDir });
    store.saveManifest(store.loadManifest());
    return run(store);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function addHttpMcp(store: AgentCatalogStore, name: string): void {
  store.addDependency('mcp', name, {
    version: '*',
    source: 'local',
    enabled: true,
    capabilities: [],
    constraints: [],
    allowedLlms: ['*'],
    vscode: { transport: 'http', url: 'https://example.com/mcp' },
  });
  store.buildLock();
}

describe('collectAgentMcpEntries', () => {
  it('registers only the maia proxy (FR-006)', () => {
    withStore((store) => {
      addHttpMcp(store, 'httpservice');

      const entries = collectAgentMcpEntries(store, claude);

      assert.deepEqual(entries.map((entry) => entry.key), ['maia']);
    });
  });

  it('does not register an installed MCP directly', () => {
    withStore((store) => {
      addHttpMcp(store, 'httpservice');

      const entries = collectAgentMcpEntries(store, claude);

      // A direct entry is spawned by the agent itself, which never loads
      // .maia/mcp.env and so cannot resolve the credential placeholders.
      assert.equal(entries.some((entry) => entry.key === 'httpservice'), false);
    });
  });

  it('registers the proxy even with no MCP installed', () => {
    withStore((store) => {
      const entries = collectAgentMcpEntries(store, claude);

      assert.deepEqual(entries.map((entry) => entry.key), ['maia']);
    });
  });

  it('emits no transport warning, since no MCP is written to the agent config', () => {
    withStore((store) => {
      addHttpMcp(store, 'httpservice');
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
      try {
        collectAgentMcpEntries(store, claude);
        assert.deepEqual(warnings, []);
      } finally {
        console.warn = originalWarn;
      }
    });
  });
});
