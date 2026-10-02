import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createLockIntegrityPayload } from '../../src/agent/catalog/lock/integrity/create.lock.integrity.payload.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';

describe('lockfile entries for skill folders (FR-012)', () => {
  it('records every file of a skill folder with its own hash', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-lock-folder-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      store.saveManifest(store.loadManifest());
      const folder = path.join(dir, '.maia', 'skills', 'demo');
      mkdirSync(path.join(folder, 'references'), { recursive: true });
      writeFileSync(path.join(folder, 'SKILL.md'), '# demo');
      writeFileSync(path.join(folder, 'references', 'a.md'), 'a');
      writeFileSync(path.join(folder, 'run.sh'), 'echo');
      store.addDependency('skill', 'demo', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['*'], path: 'skills/demo',
      });

      const pkg = store.buildLock().packages['skill:demo'];
      assert.deepEqual(Object.keys(pkg.files ?? {}).sort(), ['SKILL.md', 'references/a.md', 'run.sh']);
      assert.match(pkg.artifactHash ?? '', /^sha256:[0-9a-f]{64}$/);
      assert.ok(Object.values(pkg.files ?? {}).every((hash) => /^sha256:[0-9a-f]{64}$/.test(hash)));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps the integrity payload of older entries byte-for-byte', () => {
    const payload = createLockIntegrityPayload({
      name: 'demo', type: 'skill', version: '1.0.0', source: 'hub', resolvedFrom: '*',
      path: 'skills/demo/SKILL.md', integrity: '', enabled: true, capabilities: [], constraints: [],
      allowedLlms: ['*'], provenance: { repo: 'https://x', ref: 'main', trusted: false },
    });
    assert.equal('files' in payload, false);
    assert.equal('sourceName' in payload, false);
  });
});
