import { createGitHubHeaders } from '../../../agent/catalog/providers/github/create.git.hub.headers.ts';
import { parseGitHubRepository } from '../../../agent/catalog/providers/github/parse.git.hub.repository.ts';
import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchBuffer } from './fetch.buffer.ts';
import type { GitHubTreeEntry } from './github.tree.entry.ts';
import { selectSkillPath } from './select.skill.path.ts';
import type { SkillFiles } from './skill.files.ts';
import { skillFolderPaths } from './skill.folder.paths.ts';

/**
 * Fetches a whole skill folder from GitHub: one recursive tree call to list
 * the folder, then each file from raw content at the pinned ref.
 */
export async function fetchGitHubSkillFiles(source: CatalogSource, name: string): Promise<SkillFiles | null> {
  const repository = parseGitHubRepository(source.url);
  if (!repository) {
    return null;
  }
  const ref = source.ref ?? 'main';
  const repo = `${repository.owner}/${repository.repo}`;
  const response = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: createGitHubHeaders() },
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to inspect ${repo} (${response.status})`);
  }
  const payload = await response.json() as { tree?: GitHubTreeEntry[]; truncated?: boolean };
  const entries = (payload.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path)
    .map((entry) => ({ path: entry.path as string, symlink: entry.mode === '120000' }));

  const skillFiles = entries.map((entry) => entry.path).filter((entryPath) => entryPath.toLowerCase().endsWith('skill.md')
    && (entryPath.toLowerCase() === 'skill.md' || entryPath.toLowerCase().endsWith('/skill.md')));
  const defaultPath = `skills/${name}/SKILL.md`;
  const skillPath = skillFiles.includes(defaultPath) ? defaultPath : selectSkillPath(skillFiles, name);
  if (!skillPath) {
    if (payload.truncated) {
      throw new Error(`GitHub returned a truncated tree for ${repo}; cannot install "${name}" completely`);
    }
    return null;
  }

  const { folder, files } = skillFolderPaths(name, skillPath, entries);
  if (payload.truncated && folder) {
    // A truncated listing may have cut the folder short; refuse a partial install.
    throw new Error(`GitHub returned a truncated tree for ${repo}; cannot install "${name}" completely`);
  }
  const rawRoot = `https://raw.githubusercontent.com/${repo}/${ref}`;
  const fetched: SkillFiles = [];
  for (const file of files) {
    const remotePath = folder ? `${folder}/${file}` : skillPath;
    const content = await fetchBuffer(`${rawRoot}/${remotePath}`);
    if (content === null) {
      throw new Error(`Skill "${name}" lists ${file} but ${rawRoot}/${remotePath} is missing`);
    }
    fetched.push({ path: file, content });
  }
  return fetched;
}
