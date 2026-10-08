import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../../src/cli/commands/agent/configure.agents.ts';

describe('Cline project-config migration', () => {
  it('removes only the legacy Maia entry from .cline/mcp.json', async () => {
    const project = mkdtempSync(path.join(os.tmpdir(), 'maia-cline-legacy-'));
    const legacy = path.join(project, '.cline', 'mcp.json');
    mkdirSync(path.dirname(legacy), { recursive: true });
    writeFileSync(legacy, JSON.stringify({
      servers: {
        maia: { command: 'maia', args: ['old'] },
        other: { command: 'other', args: [] },
      },
      setting: true,
    }));
    const previous = process.env.CLINE_MCP_SETTINGS_PATH;
    process.env.CLINE_MCP_SETTINGS_PATH = path.join(project, 'missing-settings.json');
    try {
      await configureAgents(new AgentCatalogStore({ cwd: project }), ['cline']);
      const config = JSON.parse(readFileSync(legacy, 'utf8'));
      assert.deepEqual(config.servers, { other: { command: 'other', args: [] } });
      assert.equal(config.setting, true);
    } finally {
      if (previous === undefined) delete process.env.CLINE_MCP_SETTINGS_PATH;
      else process.env.CLINE_MCP_SETTINGS_PATH = previous;
      rmSync(project, { recursive: true, force: true });
    }
  });
});
