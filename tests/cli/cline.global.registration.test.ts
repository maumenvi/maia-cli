import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../src/cli/commands/agent/configure.agents.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';

describe('Cline global settings test isolation', () => {
  it('points every Cline and editor settings override to the temporary test home', () => {
    const paths = [
      process.env.CLINE_MCP_SETTINGS_PATH,
      process.env.CLINE_DATA_DIR,
      process.env.XDG_CONFIG_HOME,
      process.env.APPDATA,
    ];

    for (const value of paths) {
      assert.ok(value, 'test runner must set each settings override');
      assert.ok(
        path.relative(os.tmpdir(), path.resolve(value)).split(path.sep)[0] !== '..',
        `${value} must be inside the OS temporary directory`,
      );
    }
  });
});

describe('Cline global registration', () => {
  it('does not prompt or write global settings without a TTY and emits safe manual guidance', async () => {
    await withEnvironment(async ({ project, candidates }) => {
      const interaction = fakeInteraction();
      await configureAgents(new AgentCatalogStore({ cwd: project }), ['cline'], interaction, true);

      assert.deepEqual(interaction.questions, []);
      assert.ok(candidates.every((candidate) => !existsSync(candidate)));
      const guidance = readFileSync(path.join(project, '.clinerules', 'maia.md'), 'utf8');
      assert.match(guidance, /Cline reads MCP servers only from its global settings/);
      assert.match(guidance, /<absolute path of this project>/);
      assert.equal(guidance.includes(project), false);
      assert.equal(existsSync(path.join(project, '.cline', 'mcp.json')), false);
    });
  });

  it('registers all existing candidates after consent, prunes stale entries, and is idempotent', async () => {
    await withEnvironment(async ({ project, candidates }) => {
      for (const candidate of candidates) {
        mkdirSync(path.dirname(candidate), { recursive: true });
        writeFileSync(candidate, JSON.stringify({
          mcpServers: {
            unrelated: { command: 'other', args: [] },
            orphan: {
              command: 'maia',
              args: ['mcp-server', '--agent', 'cline'],
              env: { MAIA_PROJECT_DIR: path.join(project, 'deleted') },
            },
          },
          setting: 'preserved',
        }));
      }

      const interaction = fakeInteraction({ interactive: true, confirm: true });
      await configureAgents(new AgentCatalogStore({ cwd: project }), ['cline'], interaction, true);

      assert.equal(interaction.questions.length, 1);
      assert.match(interaction.questions[0], /Also remove 1 stale Maia entry/);
      for (const candidate of candidates) {
        const settings = JSON.parse(readFileSync(candidate, 'utf8'));
        assert.equal(settings.setting, 'preserved');
        assert.deepEqual(settings.mcpServers.unrelated, { command: 'other', args: [] });
        assert.equal(settings.mcpServers.orphan, undefined);
        assert.deepEqual(settings.mcpServers[expectedKey(project)], {
          command: 'maia',
          args: ['mcp-server', '--agent', 'cline'],
          env: { MAIA_PROJECT_DIR: project },
        });
      }

      const repeated = fakeInteraction({ interactive: true, confirm: true });
      await configureAgents(new AgentCatalogStore({ cwd: project }), ['cline'], repeated, true);
      assert.deepEqual(repeated.questions, []);
    });
  });

  it('leaves settings unchanged when the user declines', async () => {
    await withEnvironment(async ({ project, candidates }) => {
      mkdirSync(path.dirname(candidates[0]), { recursive: true });
      const original = '{"mcpServers":{"other":{"command":"other"}}}\n';
      writeFileSync(candidates[0], original);
      const interaction = fakeInteraction({ interactive: true, confirm: false });

      await configureAgents(new AgentCatalogStore({ cwd: project }), ['cline'], interaction, true);

      assert.equal(interaction.questions.length, 1);
      assert.equal(readFileSync(candidates[0], 'utf8'), original);
    });
  });

  it('does not overwrite malformed global settings and reports pending registration', async () => {
    await withEnvironment(async ({ project, candidates }) => {
      mkdirSync(path.dirname(candidates[0]), { recursive: true });
      writeFileSync(candidates[0], '{');
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message?: unknown) => warnings.push(String(message));
      const interaction = fakeInteraction({ interactive: true, confirm: true });
      try {
        await configureAgents(new AgentCatalogStore({ cwd: project }), ['cline'], interaction, true);
      } finally {
        console.warn = originalWarn;
      }

      assert.deepEqual(interaction.questions, []);
      assert.equal(readFileSync(candidates[0], 'utf8'), '{');
      assert.equal(warnings.length, 1);
      assert.match(warnings[0] ?? '', /warning: Cannot update .*invalid JSON/);
      assert.match(readFileSync(path.join(project, '.clinerules', 'maia.md'), 'utf8'), /No MCP server is registered/);
    });
  });
});

function expectedKey(project: string): string {
  const basename = path.basename(project).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = createHash('sha256').update(project).digest('hex').slice(0, 8);
  return `maia-${basename}-${hash}`;
}

async function withEnvironment(
  run: (fixture: { project: string; candidates: string[] }) => Promise<void>,
): Promise<void> {
  const root = mkdtempSync(path.join(os.tmpdir(), 'maia-cline-global-'));
  const project = path.join(root, 'project');
  const dataDir = path.join(root, 'data');
  mkdirSync(project, { recursive: true });
  const candidates = [
    path.join(root, 'explicit', 'settings.json'),
    path.join(dataDir, 'settings', 'cline_mcp_settings.json'),
  ];
  const keys = ['CLINE_MCP_SETTINGS_PATH', 'CLINE_DATA_DIR', 'XDG_CONFIG_HOME', 'APPDATA'];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  process.env.CLINE_MCP_SETTINGS_PATH = candidates[0];
  process.env.CLINE_DATA_DIR = dataDir;
  process.env.XDG_CONFIG_HOME = path.join(root, 'xdg');
  process.env.APPDATA = path.join(root, 'appdata');
  try {
    await run({ project, candidates });
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
}
