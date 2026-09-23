import type { CatalogKind } from '../../types/kinds.ts';
import type { CatalogInstall } from './catalog.install.ts';

/** Describes the catalog search result contract. */
export interface CatalogSearchResult {
  id: string;
  kind: CatalogKind;
  name: string;
  displayName: string;
  description?: string;
  provider: string;
  source: string;
  version?: string;
  installs?: number;
  credentials?: Array<{
    name: string;
    envName?: string;
    description?: string;
    sourceUrl?: string;
  }>;
  install: CatalogInstall;
}
