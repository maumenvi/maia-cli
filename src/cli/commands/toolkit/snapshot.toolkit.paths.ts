import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Expands toolkit path patterns into the project-relative paths that exist
 * now. Only the last segment may carry a `*` wildcard.
 */
export function snapshotToolkitPaths(projectRoot: string, patterns: string[]): Set<string> {
  const found = new Set<string>();
  for (const pattern of patterns) {
    const baseName = path.posix.basename(pattern);
    const parent = path.posix.dirname(pattern);
    if (!baseName.includes('*')) {
      if (existsSync(path.resolve(projectRoot, pattern))) found.add(pattern);
      continue;
    }
    const parentDir = path.resolve(projectRoot, parent);
    if (!existsSync(parentDir)) continue;
    const [prefix, suffix] = baseName.split('*', 2);
    for (const entry of readdirSync(parentDir)) {
      if (entry.startsWith(prefix) && entry.endsWith(suffix ?? '')) {
        found.add(parent === '.' ? entry : `${parent}/${entry}`);
      }
    }
  }
  return found;
}
