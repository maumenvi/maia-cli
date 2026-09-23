import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import type { CatalogKind } from '../../../agent/catalog/types/kinds.ts';

/** Performs the discovered lines operation. */
export function discoveredLines(kind: CatalogKind, results: CatalogSearchResult[]): string[] {
  return results.map((result) =>
    `${kind}:${result.name} provider=${result.provider} source=${result.source}`,
  );
}
