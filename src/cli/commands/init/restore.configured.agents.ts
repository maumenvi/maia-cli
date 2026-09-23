import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../agent/configure.agents.ts';

/** Performs the restore configured agents operation. */
export function restoreConfiguredAgents(store: AgentCatalogStore): void {
  const manifest = store.loadManifest();
  const ids = Object.keys(manifest.agents ?? {}).filter((id) => manifest.agents[id]?.enabled !== false);
  if (ids.length === 0) {
    return;
  }

  configureAgents(store, ids);
}
