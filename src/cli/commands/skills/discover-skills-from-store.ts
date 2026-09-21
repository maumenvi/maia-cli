import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog-search-result.ts';
import { searchCatalog } from '../../../agent/catalog/providers/core/search-catalog.ts';
import { AgentCatalogStore } from '../../../agent/catalog/store/agent-catalog-store.ts';

/** Performs the discover skills from store operation. */
export async function discoverSkillsFromStore(
  store: AgentCatalogStore,
  query = '',
): Promise<CatalogSearchResult[]> {
  if (query.trim()) {
    console.log('Searching skills in the catalog... this may take a few seconds.');
  }
  const { results } = await searchCatalog(store.loadManifest(), 'skill', query, 20);
  return results;
}
