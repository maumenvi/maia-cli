import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';

/**
 * Returns the single result whose name is exactly the query (case-insensitive).
 * Two results sharing that name are ambiguous, so null is returned.
 */
export function isExactCatalogIdentifier(query: string, results: CatalogSearchResult[]): CatalogSearchResult | null {
  const normalized = query.trim().toLowerCase();
  const exact = results.filter((result) => result.name.toLowerCase() === normalized);
  return exact.length === 1 ? exact[0] : null;
}
