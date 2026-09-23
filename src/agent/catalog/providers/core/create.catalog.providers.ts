import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';
import type { CatalogProvider } from '../contracts/catalog.provider.ts';
import { createProvider } from './create.provider.ts';

/** Performs the create catalog providers operation. */
export function createCatalogProviders(manifest: Pick<SourcesManifest, 'registries'>): CatalogProvider[] {
  return Object.entries(manifest.registries).map(([id, config]) => createProvider(id, config));
}
