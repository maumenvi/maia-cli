import { createGitHubHeaders } from '../../../agent/catalog/providers/github/create.git.hub.headers.ts';
import type { GitHubTreeEntry } from './github.tree.entry.ts';
import { selectSkillPath } from './select.skill.path.ts';

/** Discovers a skill file in a GitHub repository tree. */
export async function discoverGitHubSkillPath(
  owner: string,
  repo: string,
  ref: string,
  name: string,
): Promise<string | null> {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const response = await fetch(treeUrl, { headers: createGitHubHeaders() });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to inspect ${owner}/${repo} (${response.status})`);
  }

  const payload = await response.json() as { tree?: GitHubTreeEntry[] };
  const skillFiles = (payload.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path?.toLowerCase().endsWith('/skill.md'))
    .map((entry) => entry.path as string);

  return selectSkillPath(skillFiles, name);
}

