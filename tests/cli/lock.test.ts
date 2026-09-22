import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { installCommand } from '../../src/cli/commands/install/install-command.ts';
import { lockCommand } from '../../src/cli/commands/lock.ts';

describe('CLI lock', () => {
  it('produces a byte-for-byte identical lockfile when nothing changed', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-lock-deterministic-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lockPath = path.resolve(tempDir, 'maia.lock.json');
      await lockCommand([], { store });
      const first = readFileSync(lockPath, 'utf8');

      await lockCommand([], { store });
      const second = readFileSync(lockPath, 'utf8');

      assert.equal(second, first);
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not rewrite the lockfile when the generated content is identical', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-lock-mtime-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      const lockPath = path.resolve(tempDir, 'maia.lock.json');
      await lockCommand([], { store });
      const mtimeBefore = statSync(lockPath).mtimeMs;

      await lockCommand([], { store });
      const mtimeAfter = statSync(lockPath).mtimeMs;

      assert.equal(mtimeAfter, mtimeBefore, 'lockfile should not be rewritten when unchanged');
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not write a generatedAt field into the lockfile', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-lock-no-timestamp-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });
      await lockCommand([], { store });

      const lock = JSON.parse(readFileSync(path.resolve(tempDir, 'maia.lock.json'), 'utf8'));
      assert.equal('generatedAt' in lock, false);
      assert.equal(lock.lockfileVersion, 1);
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
