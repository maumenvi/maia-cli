import path from 'node:path';

import type { CatalogStoreOptions } from '../types/store/catalog.store.options.ts';

/** Performs the resolve manifest and lock paths operation. */
export function resolveManifestAndLockPaths(options: CatalogStoreOptions = {}) {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const stateDir = path.resolve(projectRoot, '.maia');
  return {
    projectRoot,
    stateDir,
    manifest: path.resolve(projectRoot, options.manifestFile ?? 'maia.json'),
    lock: path.resolve(projectRoot, options.lockFile ?? 'maia.lock.json'),
  };
}
