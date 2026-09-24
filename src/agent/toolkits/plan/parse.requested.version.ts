const REQUESTED_VERSION_PATTERN = /^v?(\d+\.\d+\.\d+)$/;

/**
 * Validates a user-supplied `--version`. The result is placed into argv, so
 * anything outside a plain `x.y.z` (optionally `v`-prefixed) is rejected.
 */
export function parseRequestedVersion(input: string): string {
  const match = REQUESTED_VERSION_PATTERN.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid version "${input}"`);
  }
  return match[1];
}
