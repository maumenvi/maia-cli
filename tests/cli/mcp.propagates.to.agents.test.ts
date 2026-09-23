import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../src/cli/commands/agent/configure.agents.ts';
import { restoreConfiguredAgents } from '../../src/cli/commands/init/restore.configured.agents.ts';

function withProject<T>(run: (dir: string, store: AgentCatalogStore) => T): T {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-propagate-'));
  const previousLog = console.log;
  console.log = () => {};
  try {
    const store = new AgentCatalogStore({ cwd: tempDir });
    store.saveManifest(store.loadManifest());
    return run(tempDir, store);
  } finally {
    console.log = previousLog;
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function addClaude(store: AgentCatalogStore): void {
  const manifest = store.loadManifest();
  manifest.agents = {
    claude: { id: 'claude', name: 'Claude', enabled: true, addedAt: new Date().toISOString() },
  };
  store.saveManifest(manifest);
}

function addMcp(store: AgentCatalogStore, name: string): void {
  store.addDependency('mcp', name, {
    version: '*',
    source: 'local',
    enabled: true,
    capabilities: [],
    constraints: [],
    allowedLlms: ['*'],
    vscode: { command: 'node', args: [], env: {} },
  });
  store.buildLock();
}

describe('MCP installed after an agent exists', () => {
  it('reaches the agent config once agents are restored', () => {
    withProject((dir, store) => {
      addClaude(store);
      configureAgents(store, ['claude']);

      // An MCP installed later must not stay invisible to the agent.
      addMcp(store, 'later-mcp');
      restoreConfiguredAgents(store);

      const profilePath = path.join(dir, '.maia', 'agents', 'claude', 'capabilities.json');
      assert.ok(existsSync(profilePath), 'the agent profile must exist');
      const profile = JSON.parse(readFileSync(profilePath, 'utf8')) as { mcps?: unknown[] };
      assert.ok(
        (profile.mcps ?? []).some((entry) => JSON.stringify(entry).includes('later-mcp')),
        'an MCP installed after the agent must appear in its capability profile',
      );
    });
  });

  it('registers the MCP in the agent native config file', () => {
    withProject((dir, store) => {
      addClaude(store);
      addMcp(store, 'later-mcp');
      restoreConfiguredAgents(store);

      const mcpConfig = path.join(dir, '.mcp.json');
      assert.ok(existsSync(mcpConfig), '.mcp.json must be generated for claude');
      const parsed = JSON.parse(readFileSync(mcpConfig, 'utf8')) as { mcpServers?: Record<string, unknown> };
      assert.ok(parsed.mcpServers?.['maia'], 'the maia proxy must stay registered');
    });
  });

  it('is a no-op when no agent is configured', () => {
    withProject((dir, store) => {
      addMcp(store, 'orphan-mcp');
      assert.doesNotThrow(() => restoreConfiguredAgents(store));
      assert.equal(existsSync(path.join(dir, '.mcp.json')), false);
    });
  });
});
