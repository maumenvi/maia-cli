

/** Describes the catalog dependency base contract. */
export interface CatalogDependencyBase {
  version: string;
  source: string;
  path?: string;
  enabled?: boolean;
  capabilities?: string[];
  constraints?: string[];
  allowedLlms?: string[];
}
