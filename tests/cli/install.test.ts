import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { installCommand } from '../../src/cli/commands/install/install-command.ts';
import { removeCommand } from '../../src/cli/commands/remove.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const cliEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/index.ts');
const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

describe('CLI install/remove', () => {
  it('bootstraps maia.lock.json when called without a dependency type', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-bootstrap-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await installCommand([], { store });

      assert.ok(existsSync(path.resolve(tempDir, 'maia.lock.json')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates maia.lock.json and bootstraps the workspace on a fresh install', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-fresh-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      assert.ok(existsSync(path.resolve(tempDir, 'maia.json')));
      assert.ok(existsSync(path.resolve(tempDir, 'maia.lock.json')));
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'mcp')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'skills')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'tools')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('materializes capabilities in .maia and updates the selected agent profile', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-cli-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.saveSelectedAgents(['copilot']);
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
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);

      const skillPackage = lock?.packages['skill:find-skills'];
      assert.ok(skillPackage);
      assert.equal(skillPackage?.path, 'skills/find-skills/SKILL.md');
      assert.ok(existsSync(path.resolve(tempDir, '.maia', skillPackage?.path ?? '')));
      assert.ok(readFileSync(path.resolve(tempDir, '.maia', skillPackage?.path ?? ''), 'utf8').includes('# Find Skills'));

      const vscodeMcpFile = path.resolve(tempDir, '.vscode', 'mcp.json');
      assert.ok(existsSync(vscodeMcpFile));
      assert.match(readFileSync(vscodeMcpFile, 'utf8'), /--agent/);
      const profileFile = path.resolve(tempDir, '.maia', 'agents', 'copilot', 'capabilities.json');
      assert.match(readFileSync(profileFile, 'utf8'), /"github"/);
      assert.match(readFileSync(profileFile, 'utf8'), /"find-skills"/);

      await removeCommand(['skill', 'find-skills'], { store });
      assert.ok(!existsSync(path.resolve(tempDir, '.maia', skillPackage?.path ?? '')));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('supports the i alias with the same isolated MCP env rebuild behavior', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-install-alias-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      await installCommand([
        'mcp',
        'context7fork',
        '--transport',
        'http',
        '--url',
        'https://server.smithery.ai/@renCosta2025/context7fork/mcp',
        '--headers',
        JSON.stringify({
          Authorization: '${env:RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION}',
        }),
      ], { store });

      const envFile = path.resolve(tempDir, '.maia', 'mcp.env');
      writeFileSync(envFile, 'SKILLS_REGISTRY_URL=https://skills.sh\nNODE_ENV=development\n', 'utf8');

      const result = spawnSync(process.execPath, [cliEntry, 'i'], {
        cwd: tempDir,
        encoding: 'utf8',
        env: process.env,
      });

      assert.equal(result.status, 0, result.stderr);

      const content = readFileSync(envFile, 'utf8');
      assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION=""/m);
      assert.doesNotMatch(content, /^SKILLS_REGISTRY_URL=https:\/\/skills\.sh$/m);
      assert.doesNotMatch(content, /^NODE_ENV=development$/m);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses tool installs that have no local registry entry', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-install-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });

      await assert.rejects(
        () => installCommand(['tool', 'demo'], { store }),
        /Tool "demo" is not available in the local registry/,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('installs and executes the built-in read_file tool', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-read-file-'));
    const originalCwd = process.cwd();
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      const targetFile = path.resolve(tempDir, 'sample.txt');
      writeFileSync(targetFile, 'hello tool\n', 'utf8');

      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock?.packages['tool:read_file']);
      assert.ok(lock?.packages['tool:read_file'].artifactHash);
      assert.ok(existsSync(path.resolve(tempDir, '.maia', lock?.packages['tool:read_file'].path ?? '')));

      process.chdir(tempDir);
      const runtime = await store.loadRuntimeModule('tool', 'read_file');
      assert.ok(runtime && typeof runtime === 'object' && 'tool' in runtime);
      const tool = (runtime as { tool: { execute(input: unknown): Promise<unknown> } }).tool;
      const result = await tool.execute({ path: targetFile });
      assert.equal((result as { content?: string }).content, 'hello tool\n');
      await assert.rejects(
        () => tool.execute({ path: '/etc/hostname' }),
        /workspace/,
      );
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rolls back a partial skill install when buildLock fails after materialization', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skill-rollback-'));
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
      store.buildLock(); // ensure ensureInitialized's own buildLock call doesn't consume the simulated failure

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

      const originalBuildLock = store.buildLock.bind(store);
      store.buildLock = () => {
        throw new Error('simulated buildLock failure');
      };

      await assert.rejects(
        () => installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store }),
        /simulated buildLock failure/,
      );

      store.buildLock = originalBuildLock;
      const manifest = store.loadManifest();
      assert.equal(manifest.skills['find-skills'], undefined);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'skills', 'find-skills', 'SKILL.md')), false);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rolls back a partial tool install when buildLock fails after materialization', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-rollback-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.buildLock(); // ensure ensureInitialized's own buildLock call doesn't consume the simulated failure

      const originalBuildLock = store.buildLock.bind(store);
      store.buildLock = () => {
        throw new Error('simulated buildLock failure');
      };

      await assert.rejects(
        () => installCommand(['tool', 'read_file'], { store }),
        /simulated buildLock failure/,
      );

      store.buildLock = originalBuildLock;
      const manifest = store.loadManifest();
      assert.equal(manifest.tools['read_file'], undefined);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'tools', 'read_file.mjs')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rolls back a partial MCP install when buildLock fails after registering the dependency', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-rollback-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.buildLock(); // ensure ensureInitialized's own buildLock call doesn't consume the simulated failure

      const originalBuildLock = store.buildLock.bind(store);
      store.buildLock = () => {
        throw new Error('simulated buildLock failure');
      };

      await assert.rejects(
        () => installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store }),
        /simulated buildLock failure/,
      );

      store.buildLock = originalBuildLock;
      const manifest = store.loadManifest();
      assert.equal(manifest.mcps['github'], undefined);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses to materialize a tool through a symlinked tools directory', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-symlink-'));
    const externalDir = mkdtempSync(path.join(os.tmpdir(), 'maia-tool-external-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      mkdirSync(path.resolve(tempDir, '.maia'), { recursive: true });
      symlinkSync(externalDir, path.resolve(tempDir, '.maia', 'tools'), 'dir');

      await assert.rejects(
        () => installCommand(['tool', 'read_file'], { store }),
        /symbolic links are not allowed in materialized paths/,
      );
      assert.equal(existsSync(path.resolve(externalDir, 'read_file.mjs')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(externalDir, { recursive: true, force: true });
    }
  });
});
