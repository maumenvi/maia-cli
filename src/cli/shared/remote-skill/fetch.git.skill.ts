import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { assertSafeGitUrl } from './assert.safe.git.url.ts';
import { runGit } from './run.git.ts';
import { selectSkillPath } from './select.skill.path.ts';

/** Fetches a skill from any Git-compatible remote into an isolated temporary repository. */
export async function fetchGitSkill(source: CatalogSource, name: string): Promise<string | null> {
  assertSafeGitUrl(source.url);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-git-skill-'));
  try {
    runGit(['init', '--quiet'], tempDir);
    runGit(['remote', 'add', 'origin', source.url], tempDir);
    runGit(['fetch', '--quiet', '--no-tags', '--depth=1', 'origin', source.ref ?? 'main'], tempDir);
    const skillFiles = runGit(['ls-tree', '-r', '--name-only', 'FETCH_HEAD'], tempDir)
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.toLowerCase().endsWith('/skill.md'));
    const selectedPath = selectSkillPath(skillFiles, name);
    return selectedPath ? runGit(['show', `FETCH_HEAD:${selectedPath}`], tempDir) : null;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

