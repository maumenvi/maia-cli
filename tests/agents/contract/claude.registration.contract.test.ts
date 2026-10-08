import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../../src/cli/commands/init/init.command.ts';
import { assertNoAbsolutePath } from '../../support/assert.no.absolute.path.ts';

// Contract reference: https://docs.anthropic.com/en/docs/claude-code/mcp
describe('Claude registration contract (Claude Code .mcp.json)', () => {
  it('writes the literal project MCP server format without machine-specific paths', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'maia-claude-contract-'));
    const originalCwd = process.cwd();
    try {
      process.chdir(projectRoot);
      await initCommand(['claude'], { store: new AgentCatalogStore({ cwd: projectRoot }) });
      const file = path.join(projectRoot, '.mcp.json');
      const text = readFileSync(file, 'utf8');
      assert.deepEqual(JSON.parse(text), {
        mcpServers: { maia: { command: 'maia', args: ['mcp-server', '--agent', 'claude'] } },
      });
      assertNoAbsolutePath(text, { projectRoot, homeDir: os.homedir() });
    } finally {
      process.chdir(originalCwd);
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
