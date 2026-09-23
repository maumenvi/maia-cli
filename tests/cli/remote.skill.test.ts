import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';

const FIND_SKILLS_MARKDOWN = `---
name: find-skills
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.
`;
const COMMIT = '0123456789abcdef0123456789abcdef01234567';

describe('Remote skill install', () => {
  it('downloads a skill from an explicitly configured GitHub source', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remote-skill-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addSource('skillsHub', {
        type: 'git',
        url: 'https://github.com/vercel-labs/skills',
        ref: 'main',
        trusted: true,
      });

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://api.github.com/repos/vercel-labs/skills/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        assert.equal(url, `https://raw.githubusercontent.com/vercel-labs/skills/${COMMIT}/skills/find-skills/SKILL.md`);
        return new Response(FIND_SKILLS_MARKDOWN, { status: 200, headers: { 'content-type': 'text/plain' } });
      };

      await installCommand(['skill', 'find-skills', '--source', 'skillsHub'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock?.packages['skill:find-skills'];
      assert.ok(pkg);
      assert.equal(pkg?.source, 'skillsHub');
      assert.equal(pkg?.path, 'skills/find-skills/SKILL.md');

      const installedPath = path.resolve(tempDir, '.maia', pkg?.path ?? '');
      assert.ok(existsSync(installedPath));
      assert.ok(readFileSync(installedPath, 'utf8').includes('# Find Skills'));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to fuzzy directory matching when catalog skill id differs from repo folder', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-remote-skill-fuzzy-'));
    const originalFetch = globalThis.fetch;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addSource('skillsHub', {
        type: 'git',
        url: 'https://github.com/martinholovsky/claude-skills-generator',
        ref: 'main',
        trusted: true,
      });

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://api.github.com/repos/martinholovsky/claude-skills-generator/commits/main') {
          return Response.json({ sha: COMMIT });
        }
        if (url === `https://raw.githubusercontent.com/martinholovsky/claude-skills-generator/${COMMIT}/skills/sqlite-database-expert/SKILL.md`) {
          return new Response('missing', { status: 404 });
        }
        if (url === `https://api.github.com/repos/martinholovsky/claude-skills-generator/git/trees/${COMMIT}?recursive=1`) {
          return Response.json({
            tree: [
              { type: 'blob', path: 'skills/sqlite/SKILL.md' },
              { type: 'blob', path: 'skills/python/SKILL.md' },
            ],
          });
        }
        if (url === `https://raw.githubusercontent.com/martinholovsky/claude-skills-generator/${COMMIT}/skills/sqlite/SKILL.md`) {
          return new Response(FIND_SKILLS_MARKDOWN, { status: 200, headers: { 'content-type': 'text/plain' } });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      await installCommand(['skill', 'sqlite-database-expert', '--source', 'skillsHub'], { store });

      const lock = store.loadLock();
      assert.ok(lock);
      const pkg = lock?.packages['skill:sqlite-database-expert'];
      assert.ok(pkg);
      const installedPath = path.resolve(tempDir, '.maia', pkg?.path ?? '');
      assert.ok(existsSync(installedPath));
      assert.ok(readFileSync(installedPath, 'utf8').includes('# Find Skills'));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
