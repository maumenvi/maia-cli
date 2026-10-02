import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { formatCatalogIdentifier } from './format.catalog.identifier.ts';
import { isExactCatalogIdentifier } from './is.exact.catalog.identifier.ts';

/**
 * Picks the catalog result to install. An exact identifier installs directly;
 * anything else is the user's choice on a terminal and an error elsewhere —
 * never the first search hit. Returns null when the user cancels.
 */
export async function chooseCatalogResult(input: {
  query: string;
  results: CatalogSearchResult[];
  interaction: CliInteraction;
  trustOf: (result: CatalogSearchResult) => boolean;
  notFound: string;
}): Promise<CatalogSearchResult | null> {
  const { query, results, interaction, trustOf, notFound } = input;
  if (results.length === 0) {
    throw new Error(notFound);
  }
  const exact = isExactCatalogIdentifier(query, results);
  if (exact) {
    return exact;
  }
  if (interaction.isInteractive()) {
    return interaction.select(results, { trustOf });
  }
  throw new Error([
    `"${query}" matches several catalog entries; rerun with an exact identifier:`,
    ...results.map((result) => `  ${formatCatalogIdentifier(result)}`),
  ].join('\n'));
}
