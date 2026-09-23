import type { CatalogSourceBase } from './catalog.source.base.ts';

/** Describes the git catalog source contract. */
export interface GitCatalogSource extends CatalogSourceBase {
  type: 'git';
}
