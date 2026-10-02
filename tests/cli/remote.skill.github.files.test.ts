import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchGitHubSkillFiles } from '../../src/cli/shared/remote-skill/fetch.github.skill.files.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const SOURCE = { type: 'git' as const, url: 'https://github.com/acme/skills.git', ref: COMMIT };

/** Serves a fake tree plus raw content for every listed blob. */
async function withTree<T>(tree: Array<{ path: string; mode?: string }>, run: () => Promise<T>, truncated = false): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith(`https://api.github.com/repos/acme/skills/git/trees/${COMMIT}`)) {
      return Response.json({ tree: tree.map((entry) => ({ type: 'blob', mode: '100644', ...entry })), truncated });
    }
    const prefix = `https://raw.githubusercontent.com/acme/skills/${COMMIT}/`;
    if (url.startsWith(prefix)) return new Response(`content of ${url.slice(prefix.length)}`);
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe('fetchGitHubSkillFiles', () => {
  it('returns every file of the skill folder, relative to it', async () => {
    const files = await withTree([
      { path: 'skills/x/SKILL.md' },
      { path: 'skills/x/references/a.md' },
      { path: 'skills/x/scripts/b.sh' },
      { path: 'skills/y/SKILL.md' },
    ], () => fetchGitHubSkillFiles(SOURCE, 'x'));
    assert.deepEqual(files?.map((file) => file.path).sort(), ['SKILL.md', 'references/a.md', 'scripts/b.sh']);
    assert.equal(files?.find((file) => file.path === 'references/a.md')?.content.toString(), 'content of skills/x/references/a.md');
  });

  it('finds a skill outside the default skills/ folder', async () => {
    const files = await withTree([{ path: 'tools/x/SKILL.md' }, { path: 'tools/x/ref.md' }], () => fetchGitHubSkillFiles(SOURCE, 'x'));
    assert.deepEqual(files?.map((file) => file.path).sort(), ['SKILL.md', 'ref.md']);
  });

  it('refuses a symlink inside the skill folder', async () => {
    await assert.rejects(
      withTree([{ path: 'skills/x/SKILL.md' }, { path: 'skills/x/link', mode: '120000' }], () => fetchGitHubSkillFiles(SOURCE, 'x')),
      /contains an unsafe path: link/,
    );
  });

  it('refuses a truncated tree instead of installing part of the skill', async () => {
    await assert.rejects(
      withTree([{ path: 'skills/x/SKILL.md' }], () => fetchGitHubSkillFiles(SOURCE, 'x'), true),
      /truncated tree/,
    );
  });

  it('returns null when the repository has no such skill', async () => {
    assert.equal(await withTree([{ path: 'skills/y/SKILL.md' }, { path: 'skills/z/SKILL.md' }], () => fetchGitHubSkillFiles(SOURCE, 'x')), null);
  });
});
