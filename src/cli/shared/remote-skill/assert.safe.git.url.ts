/** Rejects Git remote helpers and option-like URLs that could execute local commands. */
export function assertSafeGitUrl(url: string): void {
  const candidate = url.trim();
  if (!candidate || candidate.startsWith('-') || /^ext::/i.test(candidate)) {
    throw new Error(`Unsafe Git repository URL "${url}"`);
  }
}

