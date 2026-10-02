import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { CatalogSearchResult } from '../../src/agent/catalog/providers/contracts/catalog.search.result.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { skillsProviderId } from '../../src/cli/commands/skills/skills.provider.id.ts';
import { installCatalogResult } from '../../src/cli/install/external/install.catalog.result.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const SKILL = '---\nname: demo\ndescription: Demo.\n---\n\n# Demo\n';

/** Answers the GitHub calls a demo skill install makes. */
async function fakeGitHub(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);
  if (url === 'https://api.github.com/repos/acme/skills') return Response.json({ default_branch: 'main' });
  if (url === 'https://api.github.com/repos/acme/skills/commits/main') return Response.json({ sha: COMMIT });
  if (url.startsWith(`https://api.github.com/repos/acme/skills/git/trees/${COMMIT}`)) {
    return Response.json({ tree: [{ type: 'blob', path: 'skills/demo/SKILL.md', mode: '100644' }] });
  }
  if (url === `https://raw.githubusercontent.com/acme/skills/${COMMIT}/skills/demo/SKILL.md`) return new Response(SKILL);
  throw new Error(`Unexpected request: ${url}`);
}

/** Runs one install of acme/skills@demo in a fresh project and returns its allowedLlms. */
async function install(options: Parameters<typeof installCatalogResult>[2], trustedSource = false) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-trust-'));
  const originalFetch = globalThis.fetch;
  const output: string[] = [];
  const originalLog = console.log;
  globalThis.fetch = fakeGitHub as typeof fetch;
  console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
  try {
    const store = new AgentCatalogStore({ cwd: tempDir });
    store.saveManifest(store.loadManifest());
    if (trustedSource) {
      store.addSource('github:acme/skills', { type: 'git', url: 'https://github.com/acme/skills.git', ref: 'main', trusted: true });
    }
    const result: CatalogSearchResult = {
      id: 'acme/skills/demo',
      kind: 'skill',
      name: 'demo',
      displayName: 'demo',
      provider: skillsProviderId(store),
      source: 'acme/skills',
      install: { type: 'github', repository: 'acme/skills', skill: 'demo' },
    };
    await installCatalogResult(store, result, options);
    const manifest = store.loadManifest();
    return {
      allowedLlms: manifest.skills.demo?.allowedLlms,
      trusted: manifest.sources['github:acme/skills']?.trusted,
      output,
    };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('installCatalogResult authorization', () => {
  it('installs an untrusted skill without agent access when there is no terminal', async () => {
    const { allowedLlms, output } = await install({ interaction: fakeInteraction() });
    assert.deepEqual(allowedLlms, []);
    assert.ok(output.some((line) => line.includes('without agent access (untrusted source)')
      && line.includes('maia skills add acme/skills@demo --all-llms')));
  });

  it('asks on a terminal and authorizes on yes', async () => {
    const interaction = fakeInteraction({ interactive: true, confirm: true });
    const { allowedLlms } = await install({ interaction });
    assert.deepEqual(allowedLlms, ['*']);
    assert.match(interaction.questions[0], /Authorize skill:demo from an untrusted source/);
  });

  it('keeps agents out when the user answers no', async () => {
    const { allowedLlms } = await install({ interaction: fakeInteraction({ interactive: true, confirm: false }) });
    assert.deepEqual(allowedLlms, []);
  });

  it('treats --all-llms as explicit consent', async () => {
    const interaction = fakeInteraction();
    const { allowedLlms } = await install({ interaction, flags: { 'all-llms': 'true' } });
    assert.deepEqual(allowedLlms, ['*']);
    assert.deepEqual(interaction.questions, []);
  });

  it('authorizes a source the user declared trusted, without asking, and keeps it trusted', async () => {
    const interaction = fakeInteraction({ interactive: true });
    const { allowedLlms, trusted } = await install({ interaction }, true);
    assert.deepEqual(allowedLlms, ['*']);
    assert.equal(trusted, true);
    assert.deepEqual(interaction.questions, []);
  });
});
