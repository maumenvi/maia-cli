/** Extracts the version from package.json content, verbatim and without normalization. */
export function parseMaiaPackageVersion(content: string): string {
  const parsed = JSON.parse(content) as { version?: unknown };
  if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw new Error('package version not found');
  }

  return parsed.version;
}
