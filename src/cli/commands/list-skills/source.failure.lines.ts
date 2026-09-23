import type { CatalogSearchFailure } from '../../../agent/catalog/providers/contracts/catalog.search.failure.ts';

/** Formats catalog search failures as readable lines, one per failed provider. */
export function sourceFailureLines(failures: CatalogSearchFailure[]): string[] {
  return failures.map((failure) => `${failure.providerId}: ${failure.message}`);
}
