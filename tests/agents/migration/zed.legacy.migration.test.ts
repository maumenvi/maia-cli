import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../../src/cli/commands/agent/configure.agents.ts';

describe('Zed documented context server format', () => {
  it('writes flat command fields and preserves unrelated settings and servers', async () => {
    const project = mkdtempSync(path.join(os.tmpdir(), 'maia-zed-contract-'));
    const config = path.join(project, '.zed', 'settings.json');
    mkdirSync(path.dirname(config), { recursive: true });
    writeFileSync(config, JSON.stringify({
      theme: 'dark',
      context_servers: {
        maia: { command: { path: 'old-maia', args: ['old'] } },
        other: { command: { path: 'other', args: [] } },
      },
    }));
    try {
      await configureAgents(new AgentCatalogStore({ cwd: project }), ['zed']);
      const result = JSON.parse(readFileSync(config, 'utf8'));
      assert.equal(result.theme, 'dark');
      assert.deepEqual(result.context_servers.other, { command: { path: 'other', args: [] } });
      assert.deepEqual(result.context_servers.maia, {
        command: 'maia',
        args: ['mcp-server', '--agent', 'zed'],
      });
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
