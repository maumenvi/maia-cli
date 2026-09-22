import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { installCommand } from '../../src/cli/commands/install/install-command.ts';
import { verifyCommand } from '../../src/cli/commands/verify.ts';

describe('CLI verify', () => {
  it('succeeds against an intact installation', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-ok-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      await assert.doesNotReject(() => verifyCommand([], { store }));
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails with guidance when there is no lockfile', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-no-lock-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await assert.rejects(
        () => verifyCommand([], { store }),
        /maia\.lock\.json not found.*maia lock/s,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports every problem in one run instead of stopping at the first', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-multi-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      // Corrupt the lock so two distinct packages report problems at once.
      const lock = store.loadLock();
      assert.ok(lock);
      const toolKey = Object.keys(lock.packages).find((key) => key.startsWith('tool:'));
      assert.ok(toolKey);
      lock.packages['skill:ghost'] = {
        ...lock.packages[toolKey],
        name: 'ghost',
        type: 'skill',
        path: 'skills/ghost.ts',
        artifactHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      };
      store.saveLock(lock);

      // And corrupt the materialized tool so its hash no longer matches.
      const toolPath = path.resolve(tempDir, '.maia', lock.packages[toolKey].path);
      writeFileSync(toolPath, `${readFileSync(toolPath, 'utf8')}\n// tampered\n`, 'utf8');

      await assert.rejects(
        () => verifyCommand([], { store }),
        (error: Error) => {
          // Both the ghost package and the tampered tool must appear.
          assert.match(error.message, /skill:ghost/);
          assert.match(error.message, new RegExp(toolKey.replace(':', '\\:')));
          assert.match(error.message, /problems:/);
          return true;
        },
      );
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a lockfile whose version is not supported, not as an integrity error', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-version-'));
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
        () => verifyCommand([], { store }),
        (error: Error) => {
          assert.match(error.message, /99/);
          assert.match(error.message, /incompatible/i);
          assert.doesNotMatch(error.message, /integrity/i);
          return true;
        },
      );
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses a materialized package that has no recorded artifact hash', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-no-hash-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      // Strip the recorded hash while leaving the artifact in place: the
      // lockfile can no longer vouch for that file's content.
      const lock = store.loadLock();
      assert.ok(lock);
      const toolKey = Object.keys(lock.packages).find((key) => key.startsWith('tool:'));
      assert.ok(toolKey);
      delete lock.packages[toolKey].artifactHash;
      lock.packages[toolKey].integrity = 'recomputed-below';
      const { computeLockIntegrity } = await import('../../src/agent/catalog/lock/integrity/compute-lock-integrity.ts');
      lock.packages[toolKey].integrity = computeLockIntegrity(lock.packages[toolKey]);
      store.saveLock(lock);

      await assert.rejects(
        () => verifyCommand([], { store }),
        (error: Error) => {
          assert.match(error.message, /missing-artifact-hash/);
          assert.match(error.message, /incomplete/i);
          return true;
        },
      );
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
