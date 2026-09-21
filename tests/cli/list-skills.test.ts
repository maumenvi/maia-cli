import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { listSkillsCommand } from '../../src/cli/commands/list-skills/list-skills-command.ts';

describe('CLI list-skills', () => {
  it('prints installed and discoverable skills clearly', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-'));
    const output: string[] = [];
    const originalLog = console.log;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('skill', 'find-skills', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });
      store.buildLock();

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listSkillsCommand(['find'], { store });
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    assert.match(rendered, /Maia skill discovery/);
    assert.match(rendered, /Installed skills/);
    assert.match(rendered, /skill:find-skills@1\.0\.0 source=local/);
    assert.match(rendered, /maia list-skills <query>/);
  });

  it('does not create maia.lock.json when only reading skill discovery data', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-readonly-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await listSkillsCommand([], { store });

      assert.equal(existsSync(path.resolve(tempDir, 'maia.lock.json')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'mcp.env')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports a source failure alongside results from a provider that responds', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-partial-failure-'));
    const output: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('down.example')) {
          throw new Error('provider unreachable');
        }
        return Response.json({
          skills: [{ id: 'a/b/react', skillId: 'react', name: 'React', source: 'a/b' }],
        });
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      const manifest = store.loadManifest();
      manifest.registries = {
        ...manifest.registries,
        'broken-registry': { provider: 'skills.sh', url: 'https://down.example' },
      };
      store.saveManifest(manifest);

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listSkillsCommand(['react'], { store });

      const rendered = output.join('\n');
      assert.match(rendered, /skill:react provider=skills source=a\/b/);
      assert.match(rendered, /Sources unavailable/i);
      assert.match(rendered, /broken-registry/);

      output.length = 0;
      await listSkillsCommand(['react', '--json'], { store });
      const payload = JSON.parse(output.join('\n'));
      assert.ok(Array.isArray(payload.sourceFailures));
      assert.equal(payload.sourceFailures.length, 1);
      assert.equal(payload.sourceFailures[0].provider, 'broken-registry');
      assert.ok(payload.discovered.length > 0);
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports "no results" distinctly from failure when every provider rejects', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-all-down-'));
    const output: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error('all providers down');
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listSkillsCommand(['react'], { store });
      const rendered = output.join('\n');
      assert.match(rendered, /Sources unavailable/i);
      assert.doesNotMatch(rendered, /skill:react provider=/);

      output.length = 0;
      await listSkillsCommand(['react', '--json'], { store });
      const payload = JSON.parse(output.join('\n'));
      assert.deepEqual(payload.discovered, []);
      assert.ok(payload.sourceFailures.length > 0);
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('omits a remote result that duplicates an already-installed skill', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-skills-dedup-'));
    const output: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => Response.json({
        skills: [{ id: 'a/b/find-skills', skillId: 'find-skills', name: 'find-skills', source: 'a/b' }],
      });

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('skill', 'find-skills', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });
      store.buildLock();

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listSkillsCommand(['find-skills', '--json'], { store });
      const payload = JSON.parse(output.join('\n'));
      assert.ok(payload.installed.some((line: string) => line.includes('find-skills')));
      assert.equal(payload.discovered.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
