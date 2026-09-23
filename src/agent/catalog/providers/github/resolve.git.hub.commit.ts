import type { FetchFn } from './fetch.fn.ts';
import { fetchGitHubJson } from './fetch.git.hub.json.ts';
import { parseGitHubRepository } from './parse.git.hub.repository.ts';

/** Performs the resolve git hub commit operation. */
export async function resolveGitHubCommit(
  repository: string,
  ref: string,
  fetchFn: FetchFn = fetch,
): Promise<string> {
  const parsed = parseGitHubRepository(repository);
  if (!parsed) {
    throw new Error(`Invalid GitHub repository "${repository}"`);
  }

  const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${encodeURIComponent(ref)}`;
  const commitData = await fetchGitHubJson<{ sha?: string }>(url, fetchFn);
  if (!commitData.sha || !/^[0-9a-f]{40}$/i.test(commitData.sha)) {
    throw new Error(`GitHub did not return a valid commit for ${repository}@${ref}`);
  }
  return commitData.sha.toLowerCase();
}
