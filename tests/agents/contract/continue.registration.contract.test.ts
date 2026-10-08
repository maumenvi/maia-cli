import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../../src/cli/commands/init/init.command.ts';

// Contract reference: https://docs.continue.dev/customize/deep-dives/mcp
const EXPECTED = [
  'name: Maia',
  'version: 0.0.1',
  'schema: v1',
  'mcpServers:',
  '  - name: maia',
  '    type: stdio',
  '    command: "maia"',
  '    args:',
  '      - "mcp-server"',
  '      - "--agent"',
  '      - "continue"',
  '',
].join('\n');

describe('Continue registration contract', () => {
  it('writes the documented project-scoped YAML block without absolute paths', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-continue-contract-'));
    const originalCwd = process.cwd();
    try {
      process.chdir(directory);
      await initCommand(['continue'], { store: new AgentCatalogStore({ cwd: directory }) });
      const configPath = path.join(directory, '.continue', 'mcpServers', 'maia.yaml');
      const contents = readFileSync(configPath, 'utf8');
      assert.equal(contents, EXPECTED);
      assert.equal(contents.includes(directory), false);
    } finally {
      process.chdir(originalCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
