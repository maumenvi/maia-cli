import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';

/** Performs the discovered lines operation. */
export function discoveredLines(results: CatalogSearchResult[]): string[] {
  return results.map((result) =>
    `skill:${result.name} provider=${result.provider} source=${result.source}`,
  );
}
