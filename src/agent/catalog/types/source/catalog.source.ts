import type { GitCatalogSource } from './git.catalog.source.ts';
import type { RegistryCatalogSource } from './registry.catalog.source.ts';
import type { WellKnownCatalogSource } from './well.known.catalog.source.ts';

/** Defines the catalog source type. */
export type CatalogSource = GitCatalogSource | RegistryCatalogSource | WellKnownCatalogSource;
