import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../src/cli/commands/init/init.command.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'manifests', 'incompatible-schema.maia.json');

describe('CLI init — incompatible manifest schema version', () => {
  it('refuses to proceed and reports the mismatch without changing the manifest', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-schema-incompatible-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      const manifestPath = path.resolve(tempDir, 'maia.json');
      const fixtureContent = readFileSync(fixturePath, 'utf8');
      writeFileSync(manifestPath, fixtureContent, 'utf8');

      await assert.rejects(
        () => initCommand(['claude'], { store }),
        /\^99\.0\.0/,
      );

      assert.equal(readFileSync(manifestPath, 'utf8'), fixtureContent);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('proceeds normally when the manifest schema version is compatible', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-init-schema-compatible-'));
    const originalCwd = process.cwd();
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      process.chdir(tempDir);
      await initCommand(['claude'], { store });
      const manifest = JSON.parse(readFileSync(path.resolve(tempDir, 'maia.json'), 'utf8'));
      assert.ok(manifest.maiaVersion);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
