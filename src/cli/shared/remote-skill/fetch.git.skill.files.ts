import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { assertSafeGitUrl } from './assert.safe.git.url.ts';
import { runGit } from './run.git.ts';
import { runGitBuffer } from './run.git.buffer.ts';
import { selectSkillPath } from './select.skill.path.ts';
import type { SkillFiles } from './skill.files.ts';
import { skillFolderPaths } from './skill.folder.paths.ts';

/** Fetches a whole skill folder from any Git remote through an isolated shallow clone. */
export async function fetchGitSkillFiles(source: CatalogSource, name: string): Promise<SkillFiles | null> {
  assertSafeGitUrl(source.url);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-git-skill-'));
  try {
    runGit(['init', '--quiet'], tempDir);
    runGit(['remote', 'add', 'origin', source.url], tempDir);
    runGit(['fetch', '--quiet', '--no-tags', '--depth=1', 'origin', source.ref ?? 'main'], tempDir);
    // `<mode> <type> <object>\t<path>` per line; mode 120000 is a symlink.
    const entries = runGit(['ls-tree', '-r', 'FETCH_HEAD'], tempDir)
      .split(/\r?\n/)
      .map((line) => line.match(/^(\d+) blob \S+\t(.+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => ({ path: match[2], symlink: match[1] === '120000' }));
    const skillPath = selectSkillPath(
      entries.map((entry) => entry.path).filter((entryPath) => /(^|\/)skill\.md$/i.test(entryPath)),
      name,
    );
    if (!skillPath) {
      return null;
    }
    const { folder, files } = skillFolderPaths(name, skillPath, entries);
    return files.map((file) => ({
      path: file,
      content: runGitBuffer(['show', `FETCH_HEAD:${folder ? `${folder}/${file}` : skillPath}`], tempDir),
    }));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
