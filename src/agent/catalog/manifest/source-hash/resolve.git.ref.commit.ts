import { execFileSync } from 'node:child_process';

import { FULL_GIT_SHA_PATTERN } from './full.git.sha.pattern.ts';
import { normalizeGitUrl } from './normalize.git.url.ts';

/** Performs the resolve git ref commit operation. */
export function resolveGitRefCommit(gitUrl: string, ref: string): string | null {
  try {
    const normalized = normalizeGitUrl(gitUrl);
    const remoteRef = ref.includes('/') ? `refs/heads/${ref}` : `refs/heads/${ref}`;
    const output = execFileSync('git', ['ls-remote', '--refs', normalized, remoteRef], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 5_000,
    });
    const firstLine = output.split(/\r?\n/).find(Boolean);
    if (!firstLine) {
      return null;
    }
    const [commit] = firstLine.split(/\s+/);
    return commit && FULL_GIT_SHA_PATTERN.test(commit) ? commit.toLowerCase() : null;
  } catch {
    return null;
  }
}
