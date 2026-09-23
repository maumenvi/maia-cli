import type { CatalogKind } from '../../types/kinds.ts';
import type { CatalogSearchResult } from './catalog.search.result.ts';
import type { ResolvedCatalogEntry } from './resolved.catalog.entry.ts';

/** Describes the catalog provider contract. */
export interface CatalogProvider {
  readonly id: string;
  readonly kinds: readonly CatalogKind[];
  /** Performs the search operation. */
  search(query: string, limit?: number): Promise<CatalogSearchResult[]>;
  /** Performs the resolve operation. */
  resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry>;
}
