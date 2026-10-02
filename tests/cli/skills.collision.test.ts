import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { runSkillsCli } from '../../src/cli/commands/skills/run.skills.cli.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';
import { fakeSkillFolderGitHub } from '../support/fake.skill.folder.github.ts';

/** Installs acme/skills@security-review, optionally with claude configured, returning warnings. */
async function install(withClaude: boolean): Promise<string[]> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-collision-'));
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
  console.log = () => {};
  globalThis.fetch = fakeSkillFolderGitHub('security-review', ['SKILL.md']);
  try {
    const store = new AgentCatalogStore({ cwd: dir });
    store.saveManifest(store.loadManifest());
    if (withClaude) store.saveSelectedAgents(['claude']);
    await runSkillsCli(['add', 'acme/skills@security-review', '--all-llms'], undefined, false, { store, interaction: fakeInteraction() });
    return warnings;
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('skill name collisions (FR-021)', () => {
  it('warns when the skill shadows a built-in command of a configured agent', async () => {
    const warnings = await install(true);
    assert.ok(warnings.some((line) => line.includes('built-in /security-review command of Claude') && line.includes('--as <name>')));
  });

  it('stays quiet when no agent is configured', async () => {
    assert.deepEqual((await install(false)).filter((line) => line.includes('built-in')), []);
  });
});
