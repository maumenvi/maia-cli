import { existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

import type { CatalogStorePaths } from '../types/store/catalog.store.paths.ts';

/** Moves legacy root and `.maia` catalog filenames to the current Maia layout. */
export function migrateLegacyCatalogFiles(paths: CatalogStorePaths): void {
  const candidates = [
    [path.resolve(paths.projectRoot, 'sources'), paths.manifest],
    [path.resolve(paths.projectRoot, 'source.lock'), paths.lock],
    [path.resolve(paths.stateDir, 'sources'), paths.manifest],
    [path.resolve(paths.stateDir, 'source.lock'), paths.lock],
    [path.resolve(paths.stateDir, 'maia'), paths.manifest],
    [path.resolve(paths.stateDir, 'maia.lock'), paths.lock],
    [path.resolve(paths.stateDir, 'maia.lock.json'), paths.lock],
  ];

  mkdirSync(paths.stateDir, { recursive: true });
  for (const [legacyFile, targetFile] of candidates) {
    if (legacyFile && targetFile && existsSync(legacyFile) && !existsSync(targetFile)) {
      renameSync(legacyFile, targetFile);
    }
  }
}
