import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../../src/cli/commands/init/init.command.ts';
import { assertNoAbsolutePath } from '../../support/assert.no.absolute.path.ts';

// Contract reference: https://code.visualstudio.com/docs/copilot/customization/mcp-servers
describe('Copilot registration contract (.vscode/mcp.json)', () => {
  it('writes the VS Code stdio server with workspace cwd and no machine-specific paths', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'maia-copilot-contract-'));
    const originalCwd = process.cwd();
    try {
      process.chdir(projectRoot);
      await initCommand(['copilot'], { store: new AgentCatalogStore({ cwd: projectRoot }) });
      const text = readFileSync(path.join(projectRoot, '.vscode', 'mcp.json'), 'utf8');
      assert.deepEqual(JSON.parse(text), {
        servers: {
          maia: {
            command: 'maia',
            args: ['mcp-server', '--agent', 'copilot'],
            cwd: '${workspaceFolder}',
          },
        },
      });
      assertNoAbsolutePath(text, { projectRoot, homeDir: os.homedir() });
    } finally {
      process.chdir(originalCwd);
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
