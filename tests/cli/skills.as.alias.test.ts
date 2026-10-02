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

const FILES = ['SKILL.md', 'references/injection.md'];

describe('maia skills add --as (FR-022)', () => {
  it('installs under the local name everywhere and restores it from the source name', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-skill-as-'));
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    const originalWarn = console.warn;
    const output: string[] = [];
    console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
    console.warn = (...args: unknown[]) => { output.push(args.join(' ')); };
    globalThis.fetch = fakeSkillFolderGitHub('security-review', FILES);
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      store.saveManifest(store.loadManifest());
      store.saveSelectedAgents(['claude']);
      await runSkillsCli(
        ['add', 'acme/skills@security-review', '--as', 'sentry-security-review', '--all-llms'],
        undefined, false, { store, interaction: fakeInteraction() },
      );

      const local = path.join(dir, '.maia', 'skills', 'sentry-security-review');
      for (const file of FILES) assert.ok(existsSync(path.join(local, file)));
      assert.equal(existsSync(path.join(dir, '.maia', 'skills', 'security-review')), false);
      assert.ok(existsSync(path.join(dir, '.claude', 'skills', 'sentry-security-review', 'references', 'injection.md')));
      const dependency = store.loadManifest().skills['sentry-security-review'];
      assert.equal(dependency?.sourceName, 'security-review');
      assert.equal(store.loadLock()?.packages['skill:sentry-security-review']?.sourceName, 'security-review');
      assert.ok(output.includes('Installed skill:sentry-security-review (from security-review)'));
      assert.ok(!output.some((line) => line.includes('built-in')));

      rmSync(local, { recursive: true, force: true });
      await ciCommand([], { store });
      for (const file of FILES) assert.ok(existsSync(path.join(local, file)), `ci did not restore ${file}`);
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      console.warn = originalWarn;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects an unsafe local name before touching the catalog', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-skill-as-bad-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      await assert.rejects(
        () => runSkillsCli(['add', 'acme/skills@x', '--as', '../escape'], undefined, false, { store, interaction: fakeInteraction() }),
        /Invalid skill name "\.\.\/escape"/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
