/**
 * Extracts the major, minor, and patch numbers from a semver-like version
 * string, ignoring an optional leading range operator (`^`, `~`) and any
 * pre-release/build metadata suffix. Returns `null` when the string cannot
 * be parsed as a version.
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = /^[\^~]?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}
