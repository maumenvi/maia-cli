import type { CatalogStoreOptions } from '../types/store/catalog.store.options.ts';
import { AgentCatalogStore } from './agent.catalog.store.ts';

/** Performs the create agent catalog store operation. */
export function createAgentCatalogStore(options: CatalogStoreOptions = {}): AgentCatalogStore {
  return new AgentCatalogStore(options);
}
