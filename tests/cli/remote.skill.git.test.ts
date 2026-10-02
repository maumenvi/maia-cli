import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { fetchGitSkillFiles } from '../../src/cli/shared/remote-skill/fetch.git.skill.files.ts';

/** Creates a local repository with one multi-file skill and returns its file:// URL. */
function createRepository(base: string): string {
  const repo = path.join(base, 'repo');
  mkdirSync(path.join(repo, 'skills', 'x', 'references'), { recursive: true });
  mkdirSync(path.join(repo, 'skills', 'y'), { recursive: true });
  writeFileSync(path.join(repo, 'skills', 'x', 'SKILL.md'), '# x\n');
  writeFileSync(path.join(repo, 'skills', 'x', 'references', 'a.md'), 'a\n');
  writeFileSync(path.join(repo, 'skills', 'x', 'logo.bin'), Buffer.from([0, 255, 1]));
  writeFileSync(path.join(repo, 'skills', 'y', 'SKILL.md'), '# y\n');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
  git('init', '--quiet', '--initial-branch=main');
  git('add', '.');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--quiet', '-m', 'init');
  return `file://${repo}`;
}

describe('fetchGitSkillFiles', () => {
  it('returns the whole skill folder, binary files included', async () => {
    const base = mkdtempSync(path.join(os.tmpdir(), 'maia-git-files-'));
    try {
      const url = createRepository(base);
      const files = await fetchGitSkillFiles({ type: 'git', url, ref: 'main' }, 'x');
      assert.deepEqual(files?.map((file) => file.path).sort(), ['SKILL.md', 'logo.bin', 'references/a.md']);
      assert.deepEqual([...(files?.find((file) => file.path === 'logo.bin')?.content ?? [])], [0, 255, 1]);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
