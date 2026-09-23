import type { GitCatalogSource } from '../../types/source/git.catalog.source.ts';
import type { FetchFn } from './fetch.fn.ts';
import { fetchGitHubJson } from './fetch.git.hub.json.ts';
import { parseGitHubRepository } from './parse.git.hub.repository.ts';

/** Performs the resolve git hub source operation. */
export async function resolveGitHubSource(repository: string, fetchFn: FetchFn = fetch): Promise<GitCatalogSource> {
  const parsed = parseGitHubRepository(repository);
  if (!parsed) {
    throw new Error(`Invalid GitHub repository "${repository}"`);
  }

  const apiRoot = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const repositoryData = await fetchGitHubJson<{ default_branch?: string }>(apiRoot, fetchFn);
  const branch = repositoryData.default_branch || 'main';
  const commitData = await fetchGitHubJson<{ sha?: string }>(`${apiRoot}/commits/${encodeURIComponent(branch)}`, fetchFn);
  if (!commitData.sha || !/^[0-9a-f]{40}$/i.test(commitData.sha)) {
    throw new Error(`GitHub did not return a valid commit for ${repository}`);
  }

  return {
    type: 'git',
    url: `https://github.com/${parsed.owner}/${parsed.repo}.git`,
    ref: commitData.sha.toLowerCase(),
    trusted: false,
  };
}
