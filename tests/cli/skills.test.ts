import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { discoverSkillsFromStore } from '../../src/cli/commands/skills/discover.skills.from.store.ts';
import { runSkillsCli } from '../../src/cli/commands/skills/run.skills.cli.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const SKILL_MARKDOWN = `---
name: find-skills
description: Finds external skills.
---

# Find Skills
`;

function skillsSearchResponse(): Response {
  return Response.json({
    skills: [{
      id: 'vercel-labs/skills/find-skills',
      name: 'find-skills',
      installs: 1200,
      source: 'vercel-labs/skills',
    }],
  });
}

function skillsSearchResponseWithDisplayNameSpaces(): Response {
  return Response.json({
    skills: [{
      id: 'martinholovsky/claude-skills-generator/sqlite-database-expert',
      skillId: 'sqlite-database-expert',
      name: 'sqlite database expert',
      installs: 2762,
      source: 'martinholovsky/claude-skills-generator',
    }],
  });
}

function skillsSearchResponseWithStaleFirst(): Response {
  return Response.json({
    skills: [
      {
        id: 'martinholovsky/claude-skills-generator/sqlite-database-expert',
        skillId: 'sqlite-database-expert',
        name: 'sqlite database expert',
        installs: 2762,
        source: 'martinholovsky/claude-skills-generator',
      },
      {
        id: 'rightnow-ai/openfang/sqlite-expert',
        skillId: 'sqlite-expert',
        name: 'sqlite-expert',
        installs: 322,
        source: 'rightnow-ai/openfang',
      },
    ],
  });
}

function githubSkillsSearchResponse(): Response {
  return Response.json({
    items: [{
      path: 'skills/find-skills/SKILL.md',
      repository: {
        full_name: 'vercel-labs/skills',
      },
    }],
  });
}

describe('CLI skills', () => {
  it('discovers skills through the external skills.sh provider', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-discover-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        assert.equal(String(input), 'https://skills.sh/api/search?q=find&limit=20');
        return skillsSearchResponse();
      };

      const results = await discoverSkillsFromStore(new AgentCatalogStore({ cwd: tempDir }), 'find');
      assert.deepEqual(results.map((result) => result.name), ['find-skills']);
      assert.equal(results[0]?.source, 'vercel-labs/skills');
      assert.equal(results[0]?.installs, 1200);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves the GitHub commit and installs without calling npx', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-install-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search?')) return skillsSearchResponse();
        if (url === 'https://api.github.com/repos/vercel-labs/skills') {
          return Response.json({ default_branch: 'main' });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const spawnFn = () => {
        throw new Error('npx should not be used in maia skills');
      };
      const code = await runSkillsCli(['add', 'find-skills'], spawnFn, false, { store });

      assert.equal(code, 0);
      assert.ok(existsSync(path.resolve(tempDir, '.maia', 'skills', 'find-skills', 'SKILL.md')));
      const lock = store.loadLock();
      assert.equal(lock?.sources['github:vercel-labs/skills']?.commit, COMMIT);
      assert.equal(lock?.sources['github:vercel-labs/skills']?.commitResolved, true);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('installs a skill when skills.sh display name contains spaces', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-display-name-space-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search?')) return skillsSearchResponseWithDisplayNameSpaces();
        if (url === 'https://api.github.com/repos/martinholovsky/claude-skills-generator') {
          return Response.json({ default_branch: 'main' });
        }
        if (url === 'https://api.github.com/repos/martinholovsky/claude-skills-generator/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === `https://raw.githubusercontent.com/martinholovsky/claude-skills-generator/${COMMIT}/skills/sqlite-database-expert/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const results = await discoverSkillsFromStore(store, 'sqlite');
      assert.equal(results[0]?.name, 'sqlite-database-expert');
      assert.equal(results[0]?.displayName, 'sqlite database expert');

      const code = await runSkillsCli(['add', 'sqlite-database-expert'], () => {
        throw new Error('npx should not be used in maia skills');
      }, false, { store });

      assert.equal(code, 0);
      assert.ok(existsSync(path.resolve(tempDir, '.maia', 'skills', 'sqlite-database-expert', 'SKILL.md')));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails without a terminal on an ambiguous query and lists exact identifiers', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-ambiguous-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search?')) return skillsSearchResponseWithStaleFirst();
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      await assert.rejects(
        () => runSkillsCli(['add', 'sqlite'], undefined, false, { store, interaction: fakeInteraction() }),
        (error: Error) => error.message.includes('"sqlite" matches several catalog entries')
          && error.message.includes('martinholovsky/claude-skills-generator@sqlite-database-expert')
          && error.message.includes('rightnow-ai/openfang@sqlite-expert'),
      );
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'skills')), false);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('lets the user choose on a terminal and installs only the chosen entry', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-choose-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search?')) return skillsSearchResponseWithStaleFirst();
        if (url === 'https://api.github.com/repos/rightnow-ai/openfang') return Response.json({ default_branch: 'main' });
        if (url === 'https://api.github.com/repos/rightnow-ai/openfang/commits/main') return Response.json({ sha: COMMIT });
        if (url === `https://raw.githubusercontent.com/rightnow-ai/openfang/${COMMIT}/skills/sqlite-expert/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const interaction = fakeInteraction({ interactive: true, choose: 2, confirm: false });
      await runSkillsCli(['add', 'sqlite'], undefined, false, { store, interaction });

      assert.ok(existsSync(path.resolve(tempDir, '.maia', 'skills', 'sqlite-expert', 'SKILL.md')));
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'skills', 'sqlite-database-expert')), false);
      assert.deepEqual(store.loadManifest().skills['sqlite-expert']?.allowedLlms, []);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('cancelling the choice installs nothing', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-cancel-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/search?')) return skillsSearchResponseWithStaleFirst();
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const code = await runSkillsCli(['add', 'sqlite'], undefined, false, { store, interaction: fakeInteraction({ interactive: true, choose: 0 }) });
      assert.equal(code, 0);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'skills')), false);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('discovers and installs through a github-skills registry', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-skills-github-registry-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('https://skills.sh/api/search?')) {
          return Response.json({ skills: [] });
        }
        if (url.startsWith('https://api.github.com/search/code?')) {
          return githubSkillsSearchResponse();
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills') {
          return Response.json({ default_branch: 'main' });
        }
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`) {
          return new Response(SKILL_MARKDOWN, { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const manifest = store.loadManifest();
      manifest.registries = {
        skillsGitHub: {
          provider: 'github-skills',
          url: 'https://api.github.com',
        },
      };
      store.saveManifest(manifest);

      const discovered = await discoverSkillsFromStore(store, 'find');
      assert.deepEqual(discovered.map((result) => result.name), ['find-skills']);
      assert.equal(discovered[0]?.provider, 'skillsGitHub');

      const code = await runSkillsCli(['add', 'vercel-labs/skills@find-skills'], () => {
        throw new Error('npx should not be used in maia skills');
      }, false, { store });

      assert.equal(code, 0);
      assert.ok(existsSync(path.resolve(tempDir, '.maia', 'skills', 'find-skills', 'SKILL.md')));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
