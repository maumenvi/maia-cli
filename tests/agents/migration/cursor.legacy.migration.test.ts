import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../../src/cli/commands/init/init.command.ts';

describe('Cursor legacy registration migration', () => {
  it('moves only the old server entry and is idempotent', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-cursor-migration-'));
    const originalCwd = process.cwd();
    const configPath = path.join(directory, '.cursor', 'mcp.json');
    const output: string[] = [];
    const originalLog = console.log;
    try {
      mkdirSync(path.dirname(configPath), { recursive: true });
      writeFileSync(configPath, JSON.stringify({
        servers: { maia: { command: 'old-maia' }, keep: { command: 'keep' } },
        mcpServers: { existing: { command: 'existing' }, maia: { command: 'old-maia' } },
      }));
      process.chdir(directory);
      console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
      const store = new AgentCatalogStore({ cwd: directory });
      await initCommand(['cursor'], { store });

      const first = JSON.parse(readFileSync(configPath, 'utf8'));
      assert.deepEqual(first.servers, { keep: { command: 'keep' } });
      assert.deepEqual(Object.keys(first.mcpServers).sort(), ['existing', 'maia']);
      assert.deepEqual(first.mcpServers.maia, {
        command: 'maia',
        args: ['mcp-server', '--agent', 'cursor'],
        type: 'stdio',
        env: { MAIA_PROJECT_DIR: '${workspaceFolder}' },
      });
      assert.ok(output.some((line) => line.includes(
        'Moved the "maia" proxy from .cursor/mcp.json (servers) to .cursor/mcp.json (mcpServers).',
      )));

      output.length = 0;
      await initCommand(['cursor'], { store });
      assert.equal(output.some((line) => line.includes('Moved the "maia" proxy')), false);
      assert.ok(output.some((line) => line.includes('No change in Cursor config')));
    } finally {
      console.log = originalLog;
      process.chdir(originalCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
