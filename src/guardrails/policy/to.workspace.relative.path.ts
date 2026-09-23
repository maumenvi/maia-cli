import path from 'node:path';

/**
 * Returns the workspace-relative form of a path, or undefined when it escapes.
 *
 * A path resolving outside the workspace root is never evaluated against the
 * deny list: it is blocked outright, so this returning undefined is itself the
 * signal to block.
 */
export function toWorkspaceRelativePath(targetPath: string, workspaceRoot: string): string | undefined {
  const absolute = path.resolve(workspaceRoot, targetPath);
  const relative = path.relative(workspaceRoot, absolute);
  if (relative.length === 0 || relative.startsWith('..') || path.isAbsolute(relative)) {
    return undefined;
  }
  return relative.split(path.sep).join('/');
}
