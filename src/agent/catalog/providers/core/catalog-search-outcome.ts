import type { CatalogSearchFailure } from '../contracts/catalog-search-failure.ts';
import type { CatalogSearchResult } from '../contracts/catalog-search-result.ts';

/** Describes the combined results and per-provider failures of a catalog search. */
export interface CatalogSearchOutcome {
  results: CatalogSearchResult[];
  failures: CatalogSearchFailure[];
}
