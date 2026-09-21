import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { sourceCommand } from '../../src/cli/commands/source.ts';

describe('CLI source', () => {
  it('adds a source with a valid Git URL and lists it', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-source-add-'));
    const output: string[] = [];
    const originalLog = console.log;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await sourceCommand(['add', 'myrepo', 'https://github.com/org/repo', '--ref', 'main', '--trusted', 'true'], { store });

      output.length = 0;
      await sourceCommand(['ls'], { store });
      const payload = JSON.parse(output.join('\n'));
      assert.ok(payload.sources.myrepo);
      assert.equal(payload.sources.myrepo.url, 'https://github.com/org/repo');
      assert.equal(payload.sources.myrepo.ref, 'main');
      assert.equal(payload.sources.myrepo.trusted, true);
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects an invalid Git source URL immediately, with no file changes', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-source-add-invalid-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      const manifestPath = path.resolve(tempDir, 'maia.json');

      await assert.rejects(
        () => sourceCommand(['add', 'badsource', 'not-a-url'], { store }),
        /not a valid|invalid|Git/i,
      );

      assert.equal(existsSync(manifestPath), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('leaves an existing manifest unchanged when the URL is rejected', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-source-add-existing-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      const manifestPath = path.resolve(tempDir, 'maia.json');
      const before = readFileSync(manifestPath, 'utf8');

      await assert.rejects(() => sourceCommand(['add', 'badsource', ''], { store }));

      assert.equal(readFileSync(manifestPath, 'utf8'), before);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
