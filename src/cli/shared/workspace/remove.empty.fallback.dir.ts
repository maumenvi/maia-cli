import { readdirSync, rmdirSync } from 'node:fs';

/**
 * Removes a fallback capability directory (skills/mcp/tools) when it has
 * become empty after a removal, keeping "directory exists" a reliable
 * signal that a capability of that kind is materialized (FR-013). A missing
 * directory is treated as a no-op; a directory that still has entries is
 * left untouched.
 */
export function removeEmptyFallbackDir(dirPath: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (entries.length === 0) {
    rmdirSync(dirPath);
  }
}
