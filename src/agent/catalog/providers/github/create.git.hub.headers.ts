

/** Performs the create git hub headers operation. */
export function createGitHubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'maia-cli',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
