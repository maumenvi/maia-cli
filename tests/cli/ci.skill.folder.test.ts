import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { ciCommand } from '../../src/cli/commands/ci.ts';
import { runSkillsCli } from '../../src/cli/commands/skills/run.skills.cli.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';
import { fakeSkillFolderGitHub } from '../support/fake.skill.folder.github.ts';

const FILES = ['SKILL.md', 'references/injection.md', 'scripts/check.sh'];

describe('maia ci with skill folders (FR-013)', () => {
  it('restores the whole folder in a clean clone without calling the lock stale', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-ci-folder-'));
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    console.log = () => {};
    globalThis.fetch = fakeSkillFolderGitHub('review', FILES);
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      await runSkillsCli(['add', 'acme/skills@review', '--all-llms'], undefined, false, { store, interaction: fakeInteraction() });
      assert.equal(store.loadLock()?.lockfileVersion, 3);

      // Clean clone: the committed lock and manifest, no materialized skill.
      const folder = path.join(dir, '.maia', 'skills', 'review');
      rmSync(folder, { recursive: true, force: true });

      await ciCommand([], { store });

      for (const file of FILES) assert.ok(existsSync(path.join(folder, file)), `missing ${file}`);
      assert.deepEqual(store.verifyLock(store.loadLock()!), { ok: true });
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
