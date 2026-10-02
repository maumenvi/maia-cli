import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { claude } from '../../src/agent/agents/registry/claude.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { materializeAgentSkills } from '../../src/cli/commands/agent/materialize.agent.skills.ts';

describe('materializeAgentSkills with skill folders', () => {
  it('mirrors the whole folder into the agent and drops files removed at the source', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-agent-folder-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      store.saveManifest(store.loadManifest());
      const source = path.join(dir, '.maia', 'skills', 'demo');
      mkdirSync(path.join(source, 'references'), { recursive: true });
      writeFileSync(path.join(source, 'SKILL.md'), '# demo');
      writeFileSync(path.join(source, 'references', 'a.md'), 'a');
      writeFileSync(path.join(source, 'old.md'), 'old');
      store.addDependency('skill', 'demo', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
        allowedLlms: ['*'], path: 'skills/demo',
      });
      store.buildLock();

      materializeAgentSkills(store, claude);
      const target = path.join(dir, '.claude', 'skills', 'demo');
      assert.equal(readFileSync(path.join(target, 'references', 'a.md'), 'utf8'), 'a');
      assert.ok(existsSync(path.join(target, 'old.md')));

      rmSync(path.join(source, 'old.md'));
      materializeAgentSkills(store, claude);
      assert.equal(existsSync(path.join(target, 'old.md')), false);
      assert.ok(existsSync(path.join(target, 'SKILL.md')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
