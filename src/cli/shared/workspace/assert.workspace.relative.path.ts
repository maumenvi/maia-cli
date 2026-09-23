import path from 'node:path';

/** Performs the assert workspace relative path operation. */
export function assertWorkspaceRelativePath(workspaceRoot: string, targetRelativePath: string, label: string): string {
  const candidate = targetRelativePath.trim();
  if (!candidate || candidate === '.' || candidate === '/' || candidate.startsWith('/')) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  const normalized = candidate.replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized === '..' || /(^|\/)(\.\.)($|\/)/.test(normalized)) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  const resolved = path.resolve(workspaceRoot, normalized);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid ${label}: ${targetRelativePath}`);
  }
  return resolved;
}
