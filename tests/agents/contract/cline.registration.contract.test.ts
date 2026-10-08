import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { clineEntryKey } from '../../../src/agent/agents/global/cline.entry.key.ts';
import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../../src/cli/commands/agent/configure.agents.ts';
import { fakeInteraction } from '../../support/fake.interaction.ts';
import { assertNoAbsolutePath } from '../../support/assert.no.absolute.path.ts';

// Contract reference: https://docs.cline.bot/mcp/configuring-mcp-servers
describe('Cline registration contract (global Cline MCP settings)', () => {
  it('registers the project-scoped global key only after consent and keeps project files path-safe', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'maia-cline-contract-'));
    const projectRoot = path.join(root, 'project');
    const settingsPath = path.join(root, 'cline_mcp_settings.json');
    mkdirSync(projectRoot, { recursive: true });
    writeFileSync(settingsPath, '{}\n');
    const previous = process.env.CLINE_MCP_SETTINGS_PATH;
    process.env.CLINE_MCP_SETTINGS_PATH = settingsPath;
    try {
      const interaction = fakeInteraction({ interactive: true, confirm: true });
      await configureAgents(new AgentCatalogStore({ cwd: projectRoot }), ['cline'], interaction, true);
      assert.equal(interaction.questions.length, 1);
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      assert.deepEqual(settings.mcpServers[clineEntryKey(projectRoot)], {
        command: 'maia',
        args: ['mcp-server', '--agent', 'cline'],
        env: { MAIA_PROJECT_DIR: projectRoot },
      });
      const guidance = readFileSync(path.join(projectRoot, '.clinerules', 'maia.md'), 'utf8');
      assertNoAbsolutePath(guidance, { projectRoot, homeDir: os.homedir() });
      assert.match(guidance, /Cline's global MCP settings/);
    } finally {
      if (previous === undefined) delete process.env.CLINE_MCP_SETTINGS_PATH;
      else process.env.CLINE_MCP_SETTINGS_PATH = previous;
      rmSync(root, { recursive: true, force: true });
    }
  });
});
