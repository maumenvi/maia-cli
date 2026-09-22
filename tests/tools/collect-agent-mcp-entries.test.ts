import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { collectAgentMcpEntries } from '../../src/agent/agents/inject/collect-agent-mcp-entries.ts';
import { claude } from '../../src/agent/agents/registry/claude.ts';
import type { AgentTarget } from '../../src/agent/agents/contracts/agent-target.ts';

describe('collectAgentMcpEntries', () => {
  it('omits an MCP entry when the target agent does not support its declared transport, with a warning', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-collect-mcp-entries-'));
    const originalWarn = console.warn;
    const warnings: string[] = [];
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('mcp', 'httpservice', {
        version: '*',
        source: 'local',
        enabled: true,
        capabilities: [],
        constraints: [],
        allowedLlms: ['*'],
        vscode: { transport: 'http', url: 'https://example.com/mcp' },
      });
      store.buildLock();

      console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };

      const restrictedTarget: AgentTarget = { ...claude, id: 'restricted-claude', supportedTransports: ['stdio'] };
      const entries = collectAgentMcpEntries(store, restrictedTarget);

      assert.equal(entries.some((entry) => entry.key === 'httpservice'), false);
      // the maia proxy entry is always present regardless
      assert.equal(entries.length, 1);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /restricted-claude/);
      assert.match(warnings[0], /httpservice/);
    } finally {
      console.warn = originalWarn;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('includes every entry, with no warning, for an agent that declares no transport restriction', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-collect-mcp-entries-unrestricted-'));
    const originalWarn = console.warn;
    const warnings: string[] = [];
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('mcp', 'httpservice', {
        version: '*',
        source: 'local',
        enabled: true,
        capabilities: [],
        constraints: [],
        allowedLlms: ['*'],
        vscode: { transport: 'http', url: 'https://example.com/mcp' },
      });
      store.buildLock();

      console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };

      const entries = collectAgentMcpEntries(store, claude);

      assert.equal(entries.some((entry) => entry.key === 'httpservice'), true);
      assert.equal(warnings.length, 0);
    } finally {
      console.warn = originalWarn;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
