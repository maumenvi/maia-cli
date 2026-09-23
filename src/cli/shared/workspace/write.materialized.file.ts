import { closeSync, constants, mkdirSync, openSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { assertNoSymlinkTraversal } from './assert.no.symlink.traversal.ts';

/** Performs the write materialized file operation. */
export function writeMaterializedFile(
  workspaceRoot: string,
  targetPath: string,
  label: string,
  content: string,
): void {
  assertNoSymlinkTraversal(workspaceRoot, targetPath, label);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  assertNoSymlinkTraversal(workspaceRoot, targetPath, label);

  const realRoot = realpathSync(workspaceRoot);
  const realParent = realpathSync(path.dirname(targetPath));
  const realRelative = path.relative(realRoot, realParent);
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Unsafe ${label}: materialized path resolves outside the workspace`);
  }

  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  const fd = openSync(
    targetPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | noFollow,
    0o666,
  );
  try {
    writeFileSync(fd, content, 'utf8');
  } finally {
    closeSync(fd);
  }
}
