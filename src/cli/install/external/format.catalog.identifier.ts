import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';

/** The exact identifier that installs this result without any search ambiguity. */
export function formatCatalogIdentifier(result: CatalogSearchResult): string {
  if (result.install.type === 'github') {
    return `${result.install.repository}@${result.install.skill}`;
  }
  return result.name;
}
