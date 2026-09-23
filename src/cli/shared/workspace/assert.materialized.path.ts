import path from 'node:path';

import { assertWorkspaceRelativePath } from './assert.workspace.relative.path.ts';

/** Performs the assert materialized path operation. */
export function assertMaterializedPath(
  workspaceRoot: string,
  targetRelativePath: string,
  label: string,
  allowedPrefix: string,
): string {
  const resolved = assertWorkspaceRelativePath(workspaceRoot, targetRelativePath, label);
  const relative = path.relative(workspaceRoot, resolved).replace(/\\/g, '/');
  if (relative !== allowedPrefix && !relative.startsWith(`${allowedPrefix}/`)) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  return resolved;
}
