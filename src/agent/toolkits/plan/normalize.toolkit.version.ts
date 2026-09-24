const VERSION_CORE_PATTERN = /^v?(\d+\.\d+\.\d+)(?:[.+-].*)?$/;

/**
 * Reduces a version to `major.minor.patch`, dropping a `v` prefix and any
 * dev/pre-release/local suffix (`1.0.9.dev0` → `1.0.9`), so a toolkit's own
 * version report compares equal to the pinned release (research D5).
 */
export function normalizeToolkitVersion(version: string): string | null {
  return VERSION_CORE_PATTERN.exec(version.trim())?.[1] ?? null;
}
