import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../src/cli/commands/init/init.command.ts';

describe('CLI init — non-interactive without agents', () => {
  it('fails explicitly and makes no file changes when no agents are given and stdin/stdout are not a TTY', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-noninteractive-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);

      // node --test runs with stdin/stdout.isTTY === undefined, matching the
      // non-interactive environment (CI, script) this behavior targets.
      assert.ok(!process.stdin.isTTY);
      assert.ok(!process.stdout.isTTY);

      await assert.rejects(
        () => initCommand([], { store }),
        /non-interactive|agent/i,
      );

      assert.equal(existsSync(path.resolve(tempDir, 'maia.json')), false);
      assert.equal(existsSync(path.resolve(tempDir, 'maia.lock.json')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia')), false);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('leaves no maia.json when the non-interactive gate rejects on a fresh project', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-noninteractive-fresh-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      const manifestPath = path.resolve(tempDir, 'maia.json');

      await assert.rejects(() => initCommand([], { store }));

      assert.equal(existsSync(manifestPath), false);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('restores saved agents (FR-010) instead of failing when init reruns non-interactively with no new agents', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-noninteractive-restore-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      await initCommand(['claude'], { store });
      const configPath = path.resolve(tempDir, '.mcp.json');
      rmSync(configPath, { force: true });

      // Re-running init with no explicit agents, still non-interactive, must
      // restore the already-saved "claude" agent rather than rejecting —
      // FR-010 takes precedence over FR-003 once agents are already saved.
      await initCommand([], { store });

      assert.ok(existsSync(configPath));
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('still succeeds in a non-interactive environment when agents are given explicitly', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-noninteractive-explicit-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      assert.ok(!process.stdin.isTTY);

      await initCommand(['claude'], { store });

      assert.ok(existsSync(path.resolve(tempDir, 'maia.json')));
      assert.ok(existsSync(path.resolve(tempDir, 'maia.lock.json')));
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
