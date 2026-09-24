import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { mcpConfigToServerEntry } from '../../src/agent/agents/inject/mcp.config.to.server.entry.ts';
import { agentRegistry } from '../../src/agent/agents/registry/agent.registry.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { agentCommand } from '../../src/cli/commands/agent/agent.command.ts';
import { initCommand } from '../../src/cli/commands/init/init.command.ts';
import { parseAgentSelection } from '../../src/cli/commands/init/parse.agent.selection.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';

describe('CLI agent/init', () => {
  it('parses multi-agent selections from interactive input', () => {
    assert.deepEqual(parseAgentSelection('1, 4, vscode'), ['claude', 'zed', 'copilot']);
  });

  it('keeps every supported agent on local project paths', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-local-agent-'));

    try {
      for (const agent of agentRegistry) {
        const [configPath] = agent.configPaths(tempDir);
        assert.ok(configPath.startsWith(tempDir), `${agent.id} should resolve to a project-local path`);
        assert.ok(!configPath.startsWith(path.join(os.homedir(), '.config')));
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('skips global agent config injection in local-only mode', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-add-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      await agentCommand(['claude', 'vscode'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      const claudeConfig = path.resolve(tempHome, '.config', 'claude', 'claude_desktop_config.json');
      const copilotConfig = path.resolve(tempHome, '.config', 'Code', 'User', 'mcp.json');

      assert.ok(!existsSync(claudeConfig));
      assert.ok(!existsSync(copilotConfig));
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('initializes workspace folders and keeps agent guidance local', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'maia-init-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      await initCommand(['claude,copilot', 'zed'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(path.resolve(tempDir, 'maia.lock.json')));
      assert.ok(existsSync(path.resolve(tempDir, 'maia.json')));
      assert.equal(existsSync(path.resolve(tempDir, 'sources')), false);
      assert.equal(existsSync(path.resolve(tempDir, 'source.lock')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.env.maia')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'AGENTS.md')), false);

      const claudeConfig = path.resolve(tempHome, '.config', 'claude', 'claude_desktop_config.json');
      const copilotConfig = path.resolve(tempHome, '.config', 'Code', 'User', 'mcp.json');
      const zedConfig = path.resolve(tempHome, '.config', 'zed', 'settings.json');

      assert.ok(!existsSync(claudeConfig));
      assert.ok(!existsSync(copilotConfig));
      assert.ok(!existsSync(zedConfig));
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'mcp')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'skills')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'tools')), false);
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('always persists selected agents without requiring -save', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-save-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);

      await initCommand(['codex'], { store });
      await agentCommand(['claude'], { store });

      const manifest = JSON.parse(readFileSync(store.getPaths().manifest, 'utf8'));
      assert.ok(manifest.agents.codex);
      assert.equal(manifest.agents.codex.name, 'OpenAI Codex');
      assert.ok(manifest.agents.claude);
      assert.equal(manifest.agents.claude.name, 'Claude');
      assert.equal(existsSync(path.resolve(tempDir, 'maia.json')), true);
      assert.match(readFileSync(path.resolve(tempDir, '.codex', 'config.toml'), 'utf8'), /"--agent","codex"/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('migrates legacy catalog filenames to maia.json and maia.lock.json', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-catalog-migration-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      writeFileSync(path.resolve(tempDir, 'sources'), `${JSON.stringify(store.loadManifest(), null, 2)}\n`, 'utf8');
      writeFileSync(path.resolve(tempDir, 'source.lock'), `${JSON.stringify(store.buildLock(), null, 2)}\n`, 'utf8');
      rmSync(store.getPaths().manifest, { force: true });
      rmSync(store.getPaths().lock, { force: true });

      await initCommand(['codex'], { store });

      assert.equal(existsSync(path.resolve(tempDir, 'sources')), false);
      assert.equal(existsSync(path.resolve(tempDir, 'source.lock')), false);
      assert.equal(existsSync(path.resolve(tempDir, 'maia.json')), true);
      assert.equal(existsSync(path.resolve(tempDir, 'maia.lock.json')), true);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('writes a security-filtered capability profile for every selected agent', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-profiles-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      store.saveManifest(store.loadManifest());
      store.addDependency('skill', 'codex-only', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['codex'], path: 'skills/codex-only.md',
      });
      store.addDependency('tool', 'claude-only', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['claude'], path: 'tools/claude-only.mjs',
      });
      store.addDependency('mcp', 'shared-mcp', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['*'], vscode: { command: 'shared-mcp', args: [] },
      });
      store.buildLock();

      await initCommand(['codex', 'claude'], { store });

      const codex = JSON.parse(readFileSync(path.resolve(tempDir, '.maia', 'agents', 'codex', 'capabilities.json'), 'utf8'));
      const claude = JSON.parse(readFileSync(path.resolve(tempDir, '.maia', 'agents', 'claude', 'capabilities.json'), 'utf8'));
      assert.deepEqual(codex.skills.map((entry: { name: string }) => entry.name), ['codex-only']);
      assert.deepEqual(codex.tools, []);
      assert.deepEqual(claude.skills, []);
      assert.deepEqual(claude.tools.map((entry: { name: string }) => entry.name), ['claude-only']);
      assert.equal(codex.mcps[0]?.name, 'shared-mcp');
      assert.equal(claude.mcps[0]?.name, 'shared-mcp');
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('converts every MCP transport into a native server entry', () => {
    assert.deepEqual(
      mcpConfigToServerEntry('a', { command: 'srv', args: ['--x'], env: { K: 'v' } }),
      { command: 'srv', args: ['--x'], env: { K: 'v' } },
    );
    assert.deepEqual(
      mcpConfigToServerEntry('b', { transport: 'npx', package: 'pkg', args: ['--y'] }),
      { command: 'npx', args: ['-y', 'pkg', '--y'] },
    );
    assert.deepEqual(
      mcpConfigToServerEntry('c', { transport: 'http', url: 'https://x', headers: { A: '1' } }),
      { type: 'http', url: 'https://x', headers: { A: '1' } },
    );
    assert.throws(() => mcpConfigToServerEntry('d', { transport: 'http', url: '' }), /missing a URL/);
  });

  it('registers MCPs and skills natively in each agent config', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-native-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      await initCommand(['claude'], { store });

      mkdirSync(path.resolve(tempDir, '.maia', 'skills', 'demo'), { recursive: true });
      writeFileSync(path.resolve(tempDir, '.maia', 'skills', 'demo', 'SKILL.md'), '# Demo skill\n', 'utf8');
      store.addDependency('skill', 'demo', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['*'], path: 'skills/demo/SKILL.md',
      });
      store.addDependency('skill', 'codex-secret', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['codex'], path: 'skills/codex-secret/SKILL.md',
      });
      store.addDependency('mcp', 'filesystem', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['*'], vscode: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
      });
      store.buildLock();

      await agentCommand(['claude'], { store });

      const mcpConfig = JSON.parse(readFileSync(path.resolve(tempDir, '.mcp.json'), 'utf8'));
      // FR-006 registers the Maia proxy, not each MCP: a direct entry is spawned
      // by the agent, which does not load .maia/mcp.env and so never resolves the
      // credential placeholders these configs rely on.
      assert.ok(mcpConfig.mcpServers.maia, 'maia proxy is registered');
      assert.equal(mcpConfig.mcpServers.filesystem, undefined, 'MCPs are reached through the proxy');

      assert.ok(existsSync(path.resolve(tempDir, '.claude', 'skills', 'demo', 'SKILL.md')));
      assert.equal(existsSync(path.resolve(tempDir, '.claude', 'skills', 'codex-secret', 'SKILL.md')), false);

      const claudeMd = readFileSync(path.resolve(tempDir, 'CLAUDE.md'), 'utf8');
      assert.match(claudeMd, /maia:capabilities:start/);
      assert.match(claudeMd, /`demo`/);
      assert.match(claudeMd, /`filesystem`/);
      assert.match(claudeMd, /### Toolkits\n- _none installed_/);

      await agentCommand(['claude'], { store });
      const claudeMdAgain = readFileSync(path.resolve(tempDir, 'CLAUDE.md'), 'utf8');
      assert.equal((claudeMdAgain.match(/maia:capabilities:start/g) ?? []).length, 1);
      const mcpConfigAgain = JSON.parse(readFileSync(path.resolve(tempDir, '.mcp.json'), 'utf8'));
      // Idempotent (FR-009): only the maia proxy, and no duplicate of it.
      assert.deepEqual(Object.keys(mcpConfigAgain.mcpServers), ['maia']);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('re-applies saved agents when install runs without arguments', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-install-saved-agent-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);

      await initCommand(['codex'], { store });
      const codexConfig = path.resolve(tempDir, '.codex', 'config.toml');
      rmSync(codexConfig, { force: true });
      rmSync(path.dirname(codexConfig), { recursive: true, force: true });

      await installCommand([], { store });

      assert.ok(existsSync(codexConfig));
      const contents = readFileSync(codexConfig, 'utf8');
      assert.match(contents, /\[mcp_servers\]/);
      assert.match(contents, /maia\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('re-applies saved agents when init runs without arguments', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-saved-agent-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);

      await initCommand(['copilot'], { store });
      const config = path.resolve(tempDir, '.vscode', 'mcp.json');
      rmSync(config, { force: true });
      rmSync(path.dirname(config), { recursive: true, force: true });

      await initCommand([], { store });

      assert.ok(existsSync(config));
      const contents = readFileSync(config, 'utf8');
      assert.match(contents, /"maia"/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('re-applies saved agents during CI verification', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-saved-agent-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      await initCommand(['copilot'], { store });
      const config = path.resolve(tempDir, '.vscode', 'mcp.json');
      rmSync(config, { force: true });
      rmSync(path.dirname(config), { recursive: true, force: true });

      const ci = await import('../../src/cli/commands/ci.ts').then((m) => m.ciCommand);
      await ci([], { store });

      assert.ok(existsSync(config));
      const contents = readFileSync(config, 'utf8');
      assert.match(contents, /"maia"/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates Codex config on init when Codex is selected', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-init-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);

      await initCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(path.resolve(tempDir, '.codex')));
      assert.ok(existsSync(path.resolve(tempDir, '.codex', 'config.toml')));
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not write Codex global TOML in local-only mode', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-agent-'));
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-home-'));
    const originalCwd = process.cwd();
    const originalHome = process.env.HOME;

    try {
      process.chdir(tempDir);
      process.env.HOME = tempHome;

      const existing = path.resolve(tempHome, '.codex', 'config.toml');
      mkdirSync(path.dirname(existing), { recursive: true });
      writeFileSync(existing, '[mcp_servers]\nexisting = { command = "old", args = ["x"] }\n', 'utf8');

      await agentCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      assert.ok(existsSync(existing));
      const contents = readFileSync(existing, 'utf8');
      assert.match(contents, /existing = \{ command = "old", args = \["x"\] \}/);
      assert.doesNotMatch(contents, /maia\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      process.env.HOME = originalHome;
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps Codex config idempotent across repeated init runs', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-codex-idempotent-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);

      await initCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });
      await initCommand(['codex'], { store: new AgentCatalogStore({ cwd: tempDir }) });

      const contents = readFileSync(path.resolve(tempDir, '.codex', 'config.toml'), 'utf8');
      assert.equal((contents.match(/maia\s*=\s*\{/g) ?? []).length, 1);
      assert.doesNotMatch(contents, /maia\s*=\s*\{\s*maia\s*=\s*\{/);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
