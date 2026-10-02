import type { CatalogSearchResult } from '../../agent/catalog/providers/contracts/catalog.search.result.ts';

/** Options for choosing one catalog result. */
export interface CatalogSelectOptions {
  /** Whether a result comes from a trusted source, shown next to each option. */
  trustOf?: (result: CatalogSearchResult) => boolean;
  /** Asks one question and returns the typed answer; defaults to the terminal. */
  questionFn?: (question: string) => Promise<string>;
}
