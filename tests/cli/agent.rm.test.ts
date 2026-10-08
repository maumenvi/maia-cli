import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { clineEntryKey } from '../../src/agent/agents/global/cline.entry.key.ts';
import { createClineGlobalEntry } from '../../src/agent/agents/global/cline.global.entry.ts';
import { agentCommand } from '../../src/cli/commands/agent/agent.command.ts';
import { configureAgents } from '../../src/cli/commands/agent/configure.agents.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';

describe('maia agent rm', () => {
  it('removes project registration, managed guidance, and capability profile but keeps surrounding instructions', async () => {
    await withProject(async ({ project, store }) => {
      store.saveSelectedAgents(['cursor']);
      const instructions = path.join(project, '.cursor', 'rules', 'maia.mdc');
      mkdirSync(path.dirname(instructions), { recursive: true });
      writeFileSync(instructions, 'User instructions before.\n');
      await configureAgents(store, ['cursor']);
      writeFileSync(instructions, `${readFileSync(instructions, 'utf8')}User instructions after.\n`);

      await agentCommand(['rm', 'cursor'], { store, interaction: fakeInteraction() });

      assert.deepEqual(Object.keys(store.loadManifest().agents), []);
      assert.deepEqual(JSON.parse(readFileSync(path.join(project, '.cursor', 'mcp.json'), 'utf8')), { mcpServers: {} });
      assert.equal(readFileSync(instructions, 'utf8'), 'User instructions before.\n\nUser instructions after.\n');
      assert.equal(existsSync(path.join(store.getPaths().agentsDir, 'cursor')), false);
    });
  });

  it('does not change project state for unknown agents or malformed config', async () => {
    await withProject(async ({ project, store }) => {
      store.saveSelectedAgents(['cursor']);
      const config = path.join(project, '.cursor', 'mcp.json');
      mkdirSync(path.dirname(config), { recursive: true });
      writeFileSync(config, '{');

      await assert.rejects(
        agentCommand(['rm', 'unknown-agent'], { store, interaction: fakeInteraction() }),
        /Unknown agent "unknown-agent"/,
      );
      await assert.rejects(
        agentCommand(['rm', 'cursor'], { store, interaction: fakeInteraction() }),
        /Cannot update .*invalid JSON/,
      );

      assert.ok(store.loadManifest().agents.cursor);
      assert.equal(readFileSync(config, 'utf8'), '{');
    });
  });

  it('reports unconfigured agents without modifying files', async () => {
    await withProject(async ({ project, store }) => {
      const output = await captureLog(() => agentCommand(['remove', 'cursor'], { store, interaction: fakeInteraction() }));
      assert.match(output, /Cursor is not configured in this project/);
      assert.equal(existsSync(path.join(project, '.cursor', 'mcp.json')), false);
    });
  });

  it('keeps native skills and asks before removing a registered Cline project entry', async () => {
    await withProject(async ({ root, project, store }) => {
      store.saveSelectedAgents(['cline']);
      const settings = path.join(root, 'cline', 'settings.json');
      mkdirSync(path.dirname(settings), { recursive: true });
      writeFileSync(settings, JSON.stringify({
        mcpServers: {
          [clineEntryKey(project)]: createClineGlobalEntry(project, 'cline'),
          other: { command: 'other' },
        },
      }));
      process.env.CLINE_MCP_SETTINGS_PATH = settings;

      const interaction = fakeInteraction({ interactive: true, confirm: true });
      await agentCommand(['rm', 'cline'], { store, interaction });

      assert.equal(interaction.questions.length, 1);
      const servers = JSON.parse(readFileSync(settings, 'utf8')).mcpServers;
      assert.equal(servers[clineEntryKey(project)], undefined);
      assert.deepEqual(servers.other, { command: 'other' });
    });

    it('retains an agent native skill directory and reports it to the user', async () => {
      await withProject(async ({ project, store }) => {
        store.saveSelectedAgents(['claude']);
        const skills = path.join(project, '.claude', 'skills', 'example');
        mkdirSync(skills, { recursive: true });
        writeFileSync(path.join(skills, 'SKILL.md'), '# Keep this native skill\n');
        const output = await captureLog(() =>
          agentCommand(['rm', 'claude'], { store, interaction: fakeInteraction() }));

        assert.match(output, /Skill copies in \.claude\/skills were kept/);
        assert.ok(existsSync(path.join(skills, 'SKILL.md')));
      });
    });
  });
});

async function withProject(
  run: (fixture: { root: string; project: string; store: AgentCatalogStore }) => Promise<void>,
): Promise<void> {
  const root = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-rm-'));
  const project = path.join(root, 'project');
  mkdirSync(project, { recursive: true });
  const store = new AgentCatalogStore({ cwd: project });
  const key = 'CLINE_MCP_SETTINGS_PATH';
  const previous = process.env[key];
  delete process.env[key];
  try {
    await run({ root, project, store });
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
    rmSync(root, { recursive: true, force: true });
  }
}

async function captureLog(run: () => Promise<void>): Promise<string> {
  const original = console.log;
  const lines: string[] = [];
  console.log = (...values: unknown[]) => lines.push(values.join(' '));
  try {
    await run();
  } finally {
    console.log = original;
  }
  return lines.join('\n');
}
