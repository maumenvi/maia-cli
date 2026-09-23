const GIT_PROTOCOL_PREFIXES = ['https://', 'http://', 'git@', 'ssh://', 'git://'];

/**
 * Checks whether a string looks like a Git repository URL, reusing the same
 * heuristic already implied by `resolveSourceCommit`'s host/ref checks:
 * a recognized Git protocol prefix, or a `.git` suffix. Rejects empty or
 * whitespace-only input. Pure predicate — no I/O, no network check.
 */
export function isValidGitSourceUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  return GIT_PROTOCOL_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) || trimmed.endsWith('.git');
}
