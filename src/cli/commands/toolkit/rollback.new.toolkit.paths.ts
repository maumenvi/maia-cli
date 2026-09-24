import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { deleteToolkitPaths } from './delete.toolkit.paths.ts';
import { snapshotToolkitPaths } from './snapshot.toolkit.paths.ts';

/**
 * Undoes a failed native install by deleting only the toolkit paths that did
 * not exist before it ran (research D10); anything pre-existing is untouched.
 */
export function rollbackNewToolkitPaths(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  before: Set<string>,
  patterns: string[],
): { removed: string[]; kept: string[] } {
  const created = [...snapshotToolkitPaths(store.getPaths().projectRoot, patterns)].filter((entry) => !before.has(entry));
  const { deleted, blocked } = deleteToolkitPaths(store, created, 'maia toolkit rollback');
  return { removed: deleted, kept: blocked };
}
