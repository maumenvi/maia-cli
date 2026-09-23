import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { bestCatalogMatch } from '../../install/external/best.catalog.match.ts';

/** Performs the ordered by best match operation. */
export function orderedByBestMatch(results: CatalogSearchResult[], target: string): CatalogSearchResult[] {
  const best = bestCatalogMatch(results, target);
  if (!best) {
    return [];
  }
  return [best, ...results.filter((candidate) => candidate.id !== best.id)];
}
