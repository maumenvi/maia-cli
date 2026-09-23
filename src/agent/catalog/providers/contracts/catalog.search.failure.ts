import type { CatalogKind } from '../../types/kinds.ts';

/** Describes a single provider's failure to respond during a catalog search. */
export interface CatalogSearchFailure {
  providerId: string;
  kind: CatalogKind;
  message: string;
}
