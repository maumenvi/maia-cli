import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../../src/cli/commands/agent/configure.agents.ts';
import { assertNoAbsolutePath } from '../../support/assert.no.absolute.path.ts';

// Contract reference: https://developers.openai.com/codex/mcp
describe('Codex registration contract (.codex/config.toml)', () => {
  it('writes a named MCP table and trusted-project guidance', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-contract-'));
    try {
      await configureAgents(new AgentCatalogStore({ cwd: projectRoot }), ['codex']);
      const text = readFileSync(path.join(projectRoot, '.codex', 'config.toml'), 'utf8');
      assert.equal(text, '[mcp_servers.maia]\ncommand = "maia"\nargs = ["mcp-server", "--agent", "codex"]\n');
      assertNoAbsolutePath(text, { projectRoot, homeDir: os.homedir() });
      assert.match(readFileSync(path.join(projectRoot, 'AGENTS.md'), 'utf8'), /Codex applies \.codex\/config\.toml only in trusted projects/);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
