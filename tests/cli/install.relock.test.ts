import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';
import { runSkillsCli } from '../../src/cli/commands/skills/run.skills.cli.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';
import { fakeSkillFolderGitHub } from '../support/fake.skill.folder.github.ts';

describe('maia i after a skill folder was tampered with', () => {
  it('restores the folder and leaves a lockfile that verifies', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-relock-'));
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    console.log = () => {};
    globalThis.fetch = fakeSkillFolderGitHub('review', ['SKILL.md', 'references/a.md']);
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      await runSkillsCli(['add', 'acme/skills@review', '--all-llms'], undefined, false, { store, interaction: fakeInteraction() });
      const folder = path.join(dir, '.maia', 'skills', 'review');
      rmSync(path.join(folder, 'references', 'a.md'));
      appendFileSync(path.join(folder, 'SKILL.md'), 'tampered');

      await installCommand([], { store });

      assert.deepEqual(store.verifyLock(store.loadLock()!), { ok: true });
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
