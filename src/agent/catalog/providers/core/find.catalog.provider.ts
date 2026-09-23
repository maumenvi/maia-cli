import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';
import type { CatalogProvider } from '../contracts/catalog.provider.ts';
import { createCatalogProviders } from './create.catalog.providers.ts';

/** Performs the find catalog provider operation. */
export function findCatalogProvider(
  manifest: Pick<SourcesManifest, 'registries'>,
  id: string,
): CatalogProvider {
  const provider = createCatalogProviders(manifest).find((candidate) => candidate.id === id);
  if (!provider) {
    throw new Error(`Catalog provider "${id}" is not configured`);
  }
  return provider;
}
