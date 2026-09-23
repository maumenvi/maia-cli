import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { searchCatalog } from '../../../agent/catalog/providers/core/search.catalog.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';

/** Performs the discover mcps from store operation. */
export async function discoverMcpsFromStore(
  store: AgentCatalogStore,
  query = '',
): Promise<CatalogSearchResult[]> {
  if (query.trim()) {
    console.log('Searching MCPs in the catalog... this may take a few seconds.');
  }
  const { results } = await searchCatalog(store.loadManifest(), 'mcp', query, 20);
  return results;
}
