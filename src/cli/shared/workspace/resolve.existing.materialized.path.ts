import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolves the materialized path for a removed skill or tool that still
 * exists on disk: the dependency's recorded `path`, or the first matching
 * fallback candidate (for dependencies materialized before `path` was
 * tracked). Returns `undefined` when nothing on disk matches.
 */
export function resolveExistingMaterializedPath(
  workspaceRoot: string,
  dependencyPath: string | undefined,
  fallbackPaths: string[],
): string | undefined {
  const candidates = dependencyPath ? [dependencyPath] : fallbackPaths;
  for (const relativePath of candidates) {
    const targetPath = path.resolve(workspaceRoot, relativePath);
    if (existsSync(targetPath)) {
      return targetPath;
    }
  }
  return undefined;
}
