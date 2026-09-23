import type { CatalogSourceBase } from './catalog.source.base.ts';

/** Describes the registry catalog source contract. */
export interface RegistryCatalogSource extends CatalogSourceBase {
  type: 'registry';
}
