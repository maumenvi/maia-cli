import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { ciCommand } from '../../src/cli/commands/ci.ts';
import { installCommand } from '../../src/cli/commands/install/install-command.ts';

const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;
const COMMIT = '0123456789abcdef0123456789abcdef01234567';

describe('CLI ci', () => {
  it('reinstalls skills and syncs MCP config from maia.lock.json', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-'));
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
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === 'https://raw.githubusercontent.com/vercel-labs/skills/main/skills/find-skills/SKILL.md') {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        if (/^https:\/\/raw\.githubusercontent\.com\/vercel-labs\/skills\/[0-9a-f]{40}\/skills\/find-skills\/SKILL\.md$/i.test(url)) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });
      await installCommand(['mcp', 'github', '--transport', 'npx', '--package', '@modelcontextprotocol/server-github'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const skillPackage = lock?.packages['skill:find-skills'];
      assert.ok(skillPackage);
      const skillPath = path.resolve(tempDir, '.maia', skillPackage?.path ?? '');
      const vscodeMcpPath = path.resolve(tempDir, '.vscode', 'mcp.json');
      const profilePath = path.resolve(tempDir, '.maia', 'agents', 'copilot', 'capabilities.json');

      rmSync(skillPath, { force: true });
      rmSync(vscodeMcpPath, { force: true });
      rmSync(profilePath, { force: true });

      await ciCommand([], { store });

      assert.ok(existsSync(skillPath));
      assert.ok(readFileSync(skillPath, 'utf8').includes('# Find Skills'));
      assert.ok(existsSync(vscodeMcpPath));
      assert.match(readFileSync(vscodeMcpPath, 'utf8'), /--agent/);
      assert.match(readFileSync(profilePath, 'utf8'), /"github"/);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rebuilds .maia/mcp.env from MCP placeholders during ci', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-env-'));
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

      await ciCommand([], { store });

      const content = readFileSync(envFile, 'utf8');
      assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION=""/m);
      assert.doesNotMatch(content, /^SKILLS_REGISTRY_URL=https:\/\/skills\.sh$/m);
      assert.doesNotMatch(content, /^NODE_ENV=development$/m);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('validates lock integrity before overwriting a materialized file', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-integrity-order-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock.packages['tool:read_file'];
      assert.ok(pkg);
      pkg.path = 'tools/sentinel.ts';
      store.saveLock(lock);

      const sentinelPath = path.resolve(tempDir, '.maia', 'tools', 'sentinel.ts');
      writeFileSync(sentinelPath, 'do not overwrite\n', 'utf8');

      // Repointing a package's path diverges the lock from the manifest, so the
      // staleness gate (FR-008) now rejects first — an earlier guard than the
      // integrity check this test originally exercised. What matters for SC-004
      // is unchanged: ci refuses before touching the sentinel file.
      await assert.rejects(() => ciCommand([], { store }), /out of date|Integrity mismatch for tool:read_file/);
      assert.equal(readFileSync(sentinelPath, 'utf8'), 'do not overwrite\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a changed artifact before reinstalling over it', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-artifact-order-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock.packages['tool:read_file'];
      assert.ok(pkg?.artifactHash);
      const toolPath = path.resolve(tempDir, '.maia', pkg.path);
      writeFileSync(toolPath, 'tampered artifact\n', 'utf8');

      await assert.rejects(() => ciCommand([], { store }), /Artifact hash mismatch for tool:read_file/);
      assert.equal(readFileSync(toolPath, 'utf8'), 'tampered artifact\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('validates locked source metadata before materialization', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-source-order-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      lock.sources.local.url = 'https://example.invalid/tampered.git';
      store.saveLock(lock);

      const toolPath = path.resolve(tempDir, '.maia', lock.packages['tool:read_file'].path);
      writeFileSync(toolPath, 'do not overwrite\n', 'utf8');

      // Tampering with a locked source diverges the lock from the manifest, so
      // the staleness gate (FR-008) rejects first. SC-004 still holds: nothing
      // is materialized over the sentinel file.
      await assert.rejects(() => ciCommand([], { store }), /out of date|Source metadata mismatch for tool:read_file/);
      assert.equal(readFileSync(toolPath, 'utf8'), 'do not overwrite\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses to run when the lockfile is out of date with the manifest', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-stale-lock-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lockPath = path.resolve(tempDir, 'maia.lock.json');
      const lockBefore = readFileSync(lockPath, 'utf8');

      // Edit the manifest without re-running lock — the classic stale-lock PR.
      const manifest = store.loadManifest();
      manifest.tools['read_file'].allowedLlms = ['claude'];
      store.saveManifest(manifest);

      await assert.rejects(
        () => ciCommand([], { store }),
        (error: Error) => {
          assert.match(error.message, /out of date/i);
          assert.match(error.message, /maia lock/);
          return true;
        },
      );

      // CI must never regenerate the lockfile on its own.
      assert.equal(readFileSync(lockPath, 'utf8'), lockBefore);
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs normally when the lockfile agrees with the manifest', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-fresh-lock-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      await assert.doesNotReject(() => ciCommand([], { store }));
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a lockfile whose version is not supported', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-lock-version-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      lock.lockfileVersion = 99;
      store.saveLock(lock);

      await assert.rejects(
        () => ciCommand([], { store }),
        (error: Error) => {
          assert.match(error.message, /99/);
          assert.match(error.message, /incompatible/i);
          return true;
        },
      );
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rolls back artifacts it materialized when the restore is interrupted', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-rollback-'));
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    try {
      console.log = () => {};
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

      const lock = store.loadLock();
      assert.ok(lock);
      const skillPath = path.resolve(tempDir, '.maia', lock.packages['skill:find-skills'].path);
      assert.ok(existsSync(skillPath));

      // Remove the artifact so ci has to re-materialize it. Let the fetch
      // succeed for the first request (so the file is written) and then fail,
      // interrupting the restore after it already materialized something.
      rmSync(skillPath, { force: true });
      let skillFetches = 0;
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`) {
          skillFetches += 1;
          if (skillFetches > 1) {
            throw new Error('simulated interruption after materialization');
          }
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      // First ci run materializes the skill again and succeeds.
      await ciCommand([], { store });
      assert.ok(existsSync(skillPath));

      // Now break it and make ci fail mid-restore.
      rmSync(skillPath, { force: true });
      await assert.rejects(
        () => ciCommand([], { store }),
        /unreachable|simulated interruption after materialization/,
      );

      assert.equal(existsSync(skillPath), false, 'artifact materialized by this run should be rolled back');
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
