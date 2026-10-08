import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../../src/cli/commands/init/init.command.ts';

describe('Continue legacy registration migration', () => {
  it('removes only the Maia entry and preserves config and sibling server files', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-continue-migration-'));
    const originalCwd = process.cwd();
    const configDirectory = path.join(directory, '.continue');
    const serverDirectory = path.join(configDirectory, 'mcpServers');
    const configPath = path.join(configDirectory, 'config.json');
    const siblingPath = path.join(serverDirectory, 'other.yaml');
    try {
      mkdirSync(serverDirectory, { recursive: true });
      writeFileSync(configPath, JSON.stringify({
        models: [{ name: 'local-model' }],
        mcpServers: { maia: { command: 'old-maia' }, other: { command: 'other' } },
      }));
      writeFileSync(siblingPath, 'name: other\n');
      process.chdir(directory);
      await initCommand(['continue'], { store: new AgentCatalogStore({ cwd: directory }) });

      const legacy = JSON.parse(readFileSync(configPath, 'utf8'));
      assert.deepEqual(legacy, {
        models: [{ name: 'local-model' }],
        mcpServers: { other: { command: 'other' } },
      });
      assert.equal(readFileSync(siblingPath, 'utf8'), 'name: other\n');
      assert.ok(readFileSync(path.join(serverDirectory, 'maia.yaml'), 'utf8').includes('name: maia'));
    } finally {
      process.chdir(originalCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps an otherwise empty legacy file and does not overwrite malformed JSON', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-continue-migration-invalid-'));
    const originalCwd = process.cwd();
    const configPath = path.join(directory, '.continue', 'config.json');
    try {
      mkdirSync(path.dirname(configPath), { recursive: true });
      writeFileSync(configPath, '{');
      process.chdir(directory);
      await assert.rejects(
        initCommand(['continue'], { store: new AgentCatalogStore({ cwd: directory }) }),
        /Cannot update .*\.continue\/config\.json: invalid JSON/,
      );
      assert.equal(readFileSync(configPath, 'utf8'), '{');
    } finally {
      process.chdir(originalCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
