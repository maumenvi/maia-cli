import type { AgentCatalogStore } from '../../agent/catalog/store/agent.catalog.store.ts';

/** Describes the cli context contract. */
export interface CliContext {
  store: AgentCatalogStore;
}
