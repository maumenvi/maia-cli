import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';

/** Performs the best catalog match operation. */
export function bestCatalogMatch(results: CatalogSearchResult[], query: string): CatalogSearchResult | null {
  const normalized = query.trim().toLowerCase();
  return results.find((result) => result.name.toLowerCase() === normalized)
    ?? results[0]
    ?? null;
}
