import { rmSync } from 'node:fs';
import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { assertToolkitPathsAllowed } from './assert.toolkit.paths.allowed.ts';

/** Deletes toolkit paths the guardrail allows; blocked ones are kept and returned. */
export function deleteToolkitPaths(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  relativePaths: Iterable<string>,
  reason: string,
): { deleted: string[]; blocked: string[] } {
  const { allowed, blocked } = assertToolkitPathsAllowed(store, relativePaths, 'file-delete', reason);
  for (const relativePath of allowed) {
    rmSync(path.resolve(store.getPaths().projectRoot, relativePath), { recursive: true, force: true });
  }
  return { deleted: allowed, blocked };
}
