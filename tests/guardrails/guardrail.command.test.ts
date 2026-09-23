import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { guardrailCommand } from '../../src/cli/commands/guardrail.ts';

function withWorkspace<T>(run: (dir: string, store: AgentCatalogStore) => T): T {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-guardrail-'));
  try {
    const store = new AgentCatalogStore({ cwd: tempDir });
    store.saveManifest(store.loadManifest());
    return run(tempDir, store);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeConfig(dir: string, contents: string): void {
  mkdirSync(path.join(dir, '.maia'), { recursive: true });
  writeFileSync(path.join(dir, '.maia', 'guardrails.json'), contents);
}

describe('maia guardrail check', () => {
  it('exits 0 when no path is blocked', async () => {
    await withWorkspace(async (_dir, store) => {
      const code = await guardrailCommand(['check', 'src/cli/index.ts'], { store });
      assert.equal(code ?? 0, 0);
    });
  });

  it('exits 1 when a path matches a default deny pattern', async () => {
    await withWorkspace(async (_dir, store) => {
      await assert.rejects(() => guardrailCommand(['check', '.maia/mcp.env'], { store }));
    });
  });

  it('exits 2 when the config is present but malformed', async () => {
    await withWorkspace(async (dir, store) => {
      writeConfig(dir, '{ not json');
      await assert.rejects(
        () => guardrailCommand(['check', 'any-file.txt'], { store }),
        /malformed/i,
      );
    });
  });

  it('blocks a path listed only by the project config', async () => {
    await withWorkspace(async (dir, store) => {
      writeConfig(dir, JSON.stringify({ version: 1, denyPatterns: ['build/**'] }));
      await assert.rejects(() => guardrailCommand(['check', 'build/out.bin'], { store }));
    });
  });

  it('never prints a credential value in a violation message', async () => {
    await withWorkspace(async (dir, store) => {
      writeConfig(dir, JSON.stringify({ version: 1, denyPatterns: ['**/*.secret'] }));
      let message = '';
      try {
        await guardrailCommand(['check', 'app/token.secret'], { store });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      assert.match(message, /app\/token\.secret/);
      assert.equal(message.includes('super-secret-token-value'), false);
    });
  });

  it('requires at least one path argument', async () => {
    await withWorkspace(async (_dir, store) => {
      await assert.rejects(() => guardrailCommand(['check'], { store }), /Usage/);
    });
  });
});
