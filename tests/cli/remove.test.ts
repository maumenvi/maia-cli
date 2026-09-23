import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';
import { removeCommand } from '../../src/cli/commands/remove.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

describe('CLI remove', () => {
  it('removes the materialized tool artifact and its now-empty fallback directory', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-tool-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand(['tool', 'read_file'], { store });
      const lock = store.loadLock();
      const toolPath = lock?.packages['tool:read_file']?.path;
      assert.ok(toolPath);
      assert.ok(existsSync(path.resolve(tempDir, '.maia', toolPath)));

      await removeCommand(['tool', 'read_file'], { store });

      assert.equal(existsSync(path.resolve(tempDir, '.maia', toolPath)), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'tools')), false);
      assert.equal(store.loadManifest().tools['read_file'], undefined);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('removing a tool that was never installed does not throw', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-tool-missing-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await assert.doesNotReject(() => removeCommand(['tool', 'never-installed'], { store }));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('removing an MCP resyncs every configured agent, not just VS Code', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-mcp-multi-agent-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.saveSelectedAgents(['claude', 'copilot']);

      await installCommand(['mcp', 'filesystem', '--transport', 'npx', '--package', '@modelcontextprotocol/server-filesystem'], { store });

      const claudeConfig = path.resolve(tempDir, '.mcp.json');
      const vscodeConfig = path.resolve(tempDir, '.vscode', 'mcp.json');
      // Both agents reach MCPs through the maia proxy (FR-006), so neither config
      // names the MCP directly. What this test guards is that every configured
      // agent is resynced on removal, not only VS Code.
      assert.match(readFileSync(claudeConfig, 'utf8'), /maia/);
      assert.match(readFileSync(vscodeConfig, 'utf8'), /maia/);

      await removeCommand(['mcp', 'filesystem'], { store });

      assert.match(readFileSync(claudeConfig, 'utf8'), /maia/, 'the proxy survives removing one MCP');
      assert.match(readFileSync(vscodeConfig, 'utf8'), /maia/);
      assert.equal(store.loadManifest().mcps['filesystem'], undefined, 'the MCP itself is gone');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('removing a skill deletes its native copy in every agent with a skillsDir', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-skill-native-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.saveSelectedAgents(['claude']);
      store.addSource('skillsHub', {
        type: 'git',
        url: 'https://github.com/vercel-labs/skills',
        ref: 'main',
        trusted: true,
      });

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });

      const nativeSkillFile = path.resolve(tempDir, '.claude', 'skills', 'find-skills', 'SKILL.md');
      assert.ok(existsSync(nativeSkillFile));

      await removeCommand(['skill', 'find-skills'], { store });

      assert.equal(existsSync(path.resolve(tempDir, '.claude', 'skills', 'find-skills')), false);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rolls back a skill removal when buildLock fails after removing the dependency', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-rollback-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addSource('skillsHub', {
        type: 'git',
        url: 'https://github.com/vercel-labs/skills',
        ref: 'main',
        trusted: true,
      });

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });
      const manifestBeforeRemove = store.loadManifest();
      assert.ok(manifestBeforeRemove.skills['find-skills']);

      const originalBuildLock = store.buildLock.bind(store);
      store.buildLock = () => {
        throw new Error('simulated buildLock failure');
      };

      await assert.rejects(
        () => removeCommand(['skill', 'find-skills'], { store }),
        /simulated buildLock failure/,
      );

      store.buildLock = originalBuildLock;
      assert.ok(store.loadManifest().skills['find-skills'], 'dependency should be restored after rollback');
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('blocks a removal whose materialized file matches the deny list, before deleting it', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-guardrail-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand(['tool', 'read_file'], { store });
      const lock = store.loadLock();
      const toolPath = lock?.packages['tool:read_file']?.path;
      assert.ok(toolPath);
      const absoluteToolPath = path.resolve(tempDir, '.maia', toolPath);
      assert.ok(existsSync(absoluteToolPath));

      mkdirSync(path.join(tempDir, '.maia'), { recursive: true });
      writeFileSync(
        path.join(tempDir, '.maia', 'guardrails.json'),
        JSON.stringify({ version: 1, denyPatterns: ['tools/**'] }),
      );

      await assert.rejects(() => removeCommand(['tool', 'read_file'], { store }), /BLOCK/);

      assert.ok(existsSync(absoluteToolPath), 'the artifact must survive a blocked removal');
      assert.ok(store.loadManifest().tools['read_file'], 'the manifest must stay untouched');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('allows a removal whose materialized file matches no deny pattern', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-allowed-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand(['tool', 'read_file'], { store });
      mkdirSync(path.join(tempDir, '.maia'), { recursive: true });
      writeFileSync(
        path.join(tempDir, '.maia', 'guardrails.json'),
        JSON.stringify({ version: 1, denyPatterns: ['build/**'] }),
      );

      await assert.doesNotReject(() => removeCommand(['tool', 'read_file'], { store }));
      assert.equal(store.loadManifest().tools['read_file'], undefined);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('removes an mcp with no materialized file even when a deny list exists', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remove-mcp-guardrail-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('mcp', 'filesystem', {
        version: '*',
        source: 'local',
        enabled: true,
        capabilities: [],
        constraints: [],
        allowedLlms: ['*'],
        vscode: { command: 'node', args: [], env: {} },
      });
      store.buildLock();

      mkdirSync(path.join(tempDir, '.maia'), { recursive: true });
      writeFileSync(
        path.join(tempDir, '.maia', 'guardrails.json'),
        JSON.stringify({ version: 1, denyPatterns: ['**/*'] }),
      );

      await assert.doesNotReject(() => removeCommand(['mcp', 'filesystem'], { store }));
      assert.equal(store.loadManifest().mcps['filesystem'], undefined);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
