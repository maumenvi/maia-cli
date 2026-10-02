import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';

/** Creates a project with a three-file skill folder locked, then applies `change`. */
function verifyAfter(change: (folder: string) => void, dropFiles = false) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-folder-'));
  try {
    const store = new AgentCatalogStore({ cwd: dir });
    store.saveManifest(store.loadManifest());
    const folder = path.join(dir, '.maia', 'skills', 'demo');
    mkdirSync(path.join(folder, 'references'), { recursive: true });
    writeFileSync(path.join(folder, 'SKILL.md'), '# demo');
    writeFileSync(path.join(folder, 'references', 'a.md'), 'a');
    writeFileSync(path.join(folder, 'b.md'), 'b');
    store.addDependency('skill', 'demo', {
      version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
      allowedLlms: ['*'], path: 'skills/demo',
    });
    const lock = store.buildLock();
    if (dropFiles) delete lock.packages['skill:demo'].files;
    change(folder);
    const result = store.verifyLock(lock);
    return result.ok ? [] : result.problems.map((problem) => `${problem.kind}: ${problem.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('maia verify on skill folders (FR-012)', () => {
  it('passes an untouched folder', () => {
    assert.deepEqual(verifyAfter(() => {}), []);
  });

  it('names missing, changed and unexpected files', () => {
    const problems = verifyAfter((folder) => {
      rmSync(path.join(folder, 'references', 'a.md'));
      writeFileSync(path.join(folder, 'b.md'), 'changed');
      writeFileSync(path.join(folder, 'extra.md'), 'new');
    });
    assert.deepEqual(problems.sort(), [
      'changed-file: File changed for skill:demo: b.md',
      'missing-file: File missing for skill:demo: references/a.md',
      'unexpected-file: Unexpected file for skill:demo: extra.md',
    ]);
  });

  it('flags a folder the lockfile holds no hashes for', () => {
    // Dropping `files` also breaks the entry's integrity, reported separately.
    const problems = verifyAfter(() => {}, true);
    assert.ok(problems.some((problem) => /^missing-artifact-hash: No recorded artifact hash for skill:demo/.test(problem)));
  });
});
