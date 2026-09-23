import type { CatalogSource } from '../../types/source/catalog.source.ts';
import type { CatalogSearchResult } from './catalog.search.result.ts';

/** Describes the resolved catalog entry contract. */
export interface ResolvedCatalogEntry {
  result: CatalogSearchResult;
  sourceAlias: string;
  source: CatalogSource;
}
