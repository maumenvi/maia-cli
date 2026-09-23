import type { CatalogSourceBase } from './catalog.source.base.ts';

/** Describes the well known catalog source contract. */
export interface WellKnownCatalogSource extends CatalogSourceBase {
  type: 'well-known';
}
