



/** Performs the normalize git url operation. */
export function normalizeGitUrl(url: string): string {
  return url.replace(/\.git$/i, '');
}
