import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { contextCommand } from '../../src/cli/commands/context.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';

describe('CLI context', () => {
  it('builds both context artifacts', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-context-build-'));
    const originalLog = console.log;
    try {
      console.log = () => {};
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });

      await contextCommand(['build'], { store });

      assert.ok(existsSync(path.resolve(tempDir, '.maia', 'context.dev.json')));
      assert.ok(existsSync(path.resolve(tempDir, '.maia', 'context.llm.json')));
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('shows previously built context', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-context-show-'));
    const output: string[] = [];
    const originalLog = console.log;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      await installCommand(['tool', 'read_file'], { store });
      console.log = () => {};
      await contextCommand(['build'], { store });

      console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
      await contextCommand(['show'], { store });

      const payload = JSON.parse(output.join('\n'));
      assert.ok(payload);
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails with guidance when showing context that was never built', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-context-never-built-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await assert.rejects(
        () => contextCommand(['show'], { store }),
        (error: Error) => {
          assert.match(error.message, /maia context build/);
          assert.doesNotMatch(error.message, /ENOENT/);
          return true;
        },
      );

      // The read-only command must not have generated anything.
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'context.dev.json')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
