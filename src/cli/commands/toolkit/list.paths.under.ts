import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Lists a path and, for a directory, every entry beneath it (symlinks are not followed). */
export function listPathsUnder(absolutePath: string): string[] {
  const stats = lstatSync(absolutePath, { throwIfNoEntry: false });
  if (!stats) return [];
  if (!stats.isDirectory()) return [absolutePath];
  return [
    absolutePath,
    ...readdirSync(absolutePath).flatMap((entry) => listPathsUnder(path.join(absolutePath, entry))),
  ];
}
