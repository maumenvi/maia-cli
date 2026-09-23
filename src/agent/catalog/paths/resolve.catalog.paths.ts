import path from 'node:path';

import type { CatalogStoreOptions } from '../types/store/catalog.store.options.ts';
import type { CatalogStorePaths } from '../types/store/catalog.store.paths.ts';
import { resolveContextPaths } from './context.paths.ts';
import { resolveManifestAndLockPaths } from './manifest.lock.ts';

/** Performs the resolve catalog paths operation. */
export function resolveCatalogPaths(options: CatalogStoreOptions = {}): CatalogStorePaths {
  const { projectRoot, stateDir, manifest, lock } = resolveManifestAndLockPaths(options);
  const context = resolveContextPaths(projectRoot, stateDir);

  return {
    projectRoot,
    stateDir,
    manifest,
    lock,
    mcpEnv: path.resolve(stateDir, 'mcp.env'),
    agentsDir: path.resolve(stateDir, 'agents'),
    contextDir: context.contextDir,
    contextDev: context.contextDev,
    contextLlm: context.contextLlm,
    vscodeMcp: context.vscodeMcp,
  };
}
