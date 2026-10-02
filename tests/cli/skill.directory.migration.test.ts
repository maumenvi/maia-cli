import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { listSingleFileSkills } from '../../src/agent/catalog/manifest/migrate/list.single.file.skills.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';
import { fakeSkillFolderGitHub } from '../support/fake.skill.folder.github.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const FILES = ['SKILL.md', 'references/injection.md', 'scripts/check.sh'];

describe('upgrading single-file skills (FR-014)', () => {
  it('maia i turns an old SKILL.md-only skill into its whole folder', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-skill-upgrade-'));
    const originalFetch = globalThis.fetch;
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
    globalThis.fetch = fakeSkillFolderGitHub('review', FILES);
    try {
      // Project state as an older Maia left it: one file, path ending in SKILL.md.
      const store = new AgentCatalogStore({ cwd: dir });
      store.saveManifest(store.loadManifest());
      store.addSource('github:acme/skills', { type: 'git', url: 'https://github.com/acme/skills.git', ref: COMMIT, trusted: false });
      mkdirSync(path.join(dir, '.maia', 'skills', 'review'), { recursive: true });
      writeFileSync(path.join(dir, '.maia', 'skills', 'review', 'SKILL.md'), '# old');
      store.addDependency('skill', 'review', {
        version: '*', source: 'github:acme/skills', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['*'], path: 'skills/review/SKILL.md',
      });
      store.buildLock();

      await installCommand([], { store });

      for (const file of FILES) assert.ok(existsSync(path.join(dir, '.maia', 'skills', 'review', file)), `missing ${file}`);
      assert.equal(store.loadManifest().skills.review?.path, 'skills/review');
      assert.equal(store.loadLock()?.lockfileVersion, 3);
      assert.ok(output.includes('Upgraded skill:review to include its supporting files.'));
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('leaves local registry skills alone', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-skill-upgrade-local-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      const manifest = store.loadManifest();
      manifest.skills = {
        mine: { version: '*', source: 'local', path: 'skills/mine/SKILL.md' },
        remote: { version: '*', source: 'hub', path: 'skills/remote/SKILL.md' },
        folder: { version: '*', source: 'hub', path: 'skills/folder' },
      };
      assert.deepEqual(listSingleFileSkills(manifest), ['remote']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
