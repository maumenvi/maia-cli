import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';
import { createToolkitCommand } from '../../src/cli/commands/toolkit/toolkit.command.ts';
import { createFakeToolkitIo } from '../support/fake.toolkit.io.ts';

/** Captures console.log while running `body`. */
async function capture(body: () => Promise<void>): Promise<string[]> {
  const original = console.log;
  const lines: string[] = [];
  console.log = (...parts: unknown[]) => { lines.push(parts.join(' ')); };
  try {
    await body();
  } finally {
    console.log = original;
  }
  return lines;
}

describe('maia toolkit ls', () => {
  it('lists catalog toolkits as text and JSON', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-ls-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      const command = createToolkitCommand(createFakeToolkitIo(dir));
      assert.deepEqual(await capture(() => command(['ls'], { store })), ['speckit  GitHub Spec Kit  global:yes  not installed']);

      store.setToolkit('speckit', { version: '1.0.11', scope: 'global' });
      store.buildLock();
      assert.deepEqual(await capture(() => command(['list'], { store })), ['speckit  GitHub Spec Kit  global:yes  installed 1.0.11 (global)']);

      const [json] = await capture(() => command(['ls', '--json'], { store }));
      assert.equal(JSON.parse(json)[0].version, '1.0.11');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reserves the maia_toolkits name for skills and tools', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-reserved-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      await assert.rejects(installCommand(['tool', 'maia_toolkits'], { store }), /"maia_toolkits" is a reserved name/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
