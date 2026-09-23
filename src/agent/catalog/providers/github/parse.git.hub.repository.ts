import type { GitHubRepository } from './git.hub.repository.ts';
import { GITHUB_REPOSITORY_PATTERN } from './github.repository.pattern.ts';

/** Performs the parse git hub repository operation. */
export function parseGitHubRepository(value: string): GitHubRepository | null {
  const shorthand = value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  const match = shorthand.match(GITHUB_REPOSITORY_PATTERN);
  return match ? { owner: match[1], repo: match[2] } : null;
}
