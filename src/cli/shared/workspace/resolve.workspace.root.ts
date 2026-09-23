import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';

/** Performs the resolve workspace root operation. */
export function resolveWorkspaceRoot(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return store.getPaths().stateDir;
}
