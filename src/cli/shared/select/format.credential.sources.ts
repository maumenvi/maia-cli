import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';

/** Performs the format credential sources operation. */
export function formatCredentialSources(result: CatalogSearchResult): string[] {
  const credentialSources = (result.credentials ?? [])
    .map((credential) => {
      const details = [credential.description, credential.sourceUrl].filter(Boolean).join(' · ');
      const label = credential.envName ?? credential.name;
      return details ? `${label}: ${details}` : label;
    });
  return Array.from(new Set(credentialSources));
}
