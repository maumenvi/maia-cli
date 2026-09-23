import { rmSync } from 'node:fs';

/** Performs the remove materialized file operation. */
export function removeMaterializedFile(filePath: string): void {
  rmSync(filePath, { force: true });
}
