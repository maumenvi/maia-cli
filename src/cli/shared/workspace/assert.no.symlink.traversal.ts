import path from 'node:path';

import { lstatIfPresent } from './lstat.if.present.ts';

/** Performs the assert no symlink traversal operation. */
export function assertNoSymlinkTraversal(workspaceRoot: string, targetPath: string, label: string): void {
  const root = path.resolve(workspaceRoot);
  const rootStats = lstatIfPresent(root);
  if (!rootStats?.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error(`Unsafe ${label}: workspace root must be a real directory`);
  }

  const relative = path.relative(root, targetPath);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stats = lstatIfPresent(current);
    if (stats?.isSymbolicLink()) {
      throw new Error(`Unsafe ${label}: symbolic links are not allowed in materialized paths (${current})`);
    }
  }
}
