import { rmSync } from 'node:fs';

/**
 * Removes a materialized artifact: a file, or a whole skill folder. Callers
 * only pass paths already checked to be inside the workspace.
 */
export function removeMaterializedFile(targetPath: string): void {
  rmSync(targetPath, { recursive: true, force: true });
}
