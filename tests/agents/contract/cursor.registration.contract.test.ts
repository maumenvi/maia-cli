import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { cursor } from '../../../src/agent/agents/registry/cursor.ts';
import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { collectAgentMcpEntries } from '../../../src/agent/agents/inject/collect.agent.mcp.entries.ts';
import { initCommand } from '../../../src/cli/commands/init/init.command.ts';

// Contract reference: https://cursor.com/docs/mcp
describe('Cursor registration contract', () => {
  it('emits the documented stdio registration and workspace environment without a machine path', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-cursor-contract-'));
    const originalCwd = process.cwd();
    try {
      const [entry] = collectAgentMcpEntries(new AgentCatalogStore({ cwd: directory }), cursor);
      assert.deepEqual(entry.config, {
        command: 'maia',
        args: ['mcp-server', '--agent', 'cursor'],
        type: 'stdio',
        env: { MAIA_PROJECT_DIR: '${workspaceFolder}' },
      });
      assert.equal(JSON.stringify(entry).includes(directory), false);

      process.chdir(directory);
      await initCommand(['cursor'], { store: new AgentCatalogStore({ cwd: directory }) });
      const configPath = path.join(directory, '.cursor', 'mcp.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      assert.deepEqual(config, { mcpServers: { maia: entry.config } });
      assert.equal(readFileSync(configPath, 'utf8').includes(directory), false);
    } finally {
      process.chdir(originalCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not replace an invalid existing Cursor config', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-cursor-contract-invalid-'));
    const originalCwd = process.cwd();
    const configPath = path.join(directory, '.cursor', 'mcp.json');
    try {
      mkdirSync(path.dirname(configPath), { recursive: true });
      writeFileSync(configPath, '{');
      process.chdir(directory);
      await assert.rejects(
        initCommand(['cursor'], { store: new AgentCatalogStore({ cwd: directory }) }),
        /Cannot update .*\.cursor\/mcp\.json: invalid JSON/,
      );
      assert.equal(readFileSync(configPath, 'utf8'), '{');
      assert.equal(existsSync(path.join(directory, '.cursor', 'rules', 'maia.mdc')), false);
    } finally {
      process.chdir(originalCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
