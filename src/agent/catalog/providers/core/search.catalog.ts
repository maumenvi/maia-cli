import type { CatalogKind } from '../../types/kinds.ts';
import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';
import type { CatalogSearchOutcome } from './catalog.search.outcome.ts';
import { createCatalogProviders } from './create.catalog.providers.ts';

/**
 * Queries every configured provider for `kind` in parallel and returns both
 * the merged results and the failures of any provider that rejected — a
 * single unreachable provider never hides results from the others, and its
 * failure is never silently discarded (FR-006).
 */
export async function searchCatalog(
  manifest: Pick<SourcesManifest, 'registries'>,
  kind: CatalogKind,
  query: string,
  limit = 10,
): Promise<CatalogSearchOutcome> {
  const providers = createCatalogProviders(manifest).filter((provider) => provider.kinds.includes(kind));
  const settled = await Promise.all(providers.map(async (provider) => {
    try {
      return { status: 'fulfilled' as const, providerId: provider.id, value: await provider.search(query, limit) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: 'rejected' as const, providerId: provider.id, message };
    }
  }));

  const results = settled
    .flatMap((entry) => entry.status === 'fulfilled' ? entry.value : [])
    .slice(0, limit);
  const failures = settled
    .filter((entry): entry is Extract<typeof entry, { status: 'rejected' }> => entry.status === 'rejected')
    .map((entry) => ({ providerId: entry.providerId, kind, message: entry.message }));

  return { results, failures };
}
