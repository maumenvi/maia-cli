import path from 'node:path';

/** Performs the resolve package path operation. */
export function resolvePackagePath(workspaceRoot: string, relativeOrAbsolutePath: string): string {
  return relativeOrAbsolutePath.startsWith('/')
    ? relativeOrAbsolutePath
    : path.resolve(workspaceRoot, relativeOrAbsolutePath);
}
