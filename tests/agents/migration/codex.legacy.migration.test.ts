import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { injectTomlMcpServers } from '../../../src/agent/agents/inject/inject.toml.mcp.servers.ts';
import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../../src/cli/commands/agent/configure.agents.ts';

describe('Codex documented TOML MCP format', () => {
  it('uses a named server table and preserves existing entries and other tables', async () => {
    const project = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-contract-'));
    const config = path.join(project, '.codex', 'config.toml');
    mkdirSync(path.dirname(config), { recursive: true });
    writeFileSync(config, [
      'model = "gpt-5"',
      '',
      '[mcp_servers]',
      'maia = { command = "old", args = ["old"] }',
      'other = { command = "other", args = [] }',
      '',
      '[features]',
      'search = true',
      '',
    ].join('\n'));
    try {
      await configureAgents(new AgentCatalogStore({ cwd: project }), ['codex']);
      const result = readFileSync(config, 'utf8');
      assert.match(result, /\[mcp_servers\.maia\]\ncommand = "maia"\nargs = \["mcp-server", "--agent", "codex"\]/);
      assert.match(result, /other = \{ command = "other", args = \[\] \}/);
      assert.match(result, /\[features\]\nsearch = true/);
      assert.doesNotMatch(result, /^maia\s*=/m);
      assert.match(readFileSync(path.join(project, 'AGENTS.md'), 'utf8'), /Codex applies \.codex\/config\.toml only in trusted projects/);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('writes environment variables using TOML inline-table syntax', () => {
    const project = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-env-'));
    const config = path.join(project, '.codex', 'config.toml');
    try {
      injectTomlMcpServers(config, 'maia', {
        command: 'maia',
        args: ['mcp-server'],
        env: { API_KEY: 'token', 'KEY.WITH.DOT': 'other' },
      });
      assert.equal(
        readFileSync(config, 'utf8'),
        '[mcp_servers.maia]\ncommand = "maia"\nargs = ["mcp-server"]\nenv = { "API_KEY" = "token", "KEY.WITH.DOT" = "other" }\n',
      );
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
