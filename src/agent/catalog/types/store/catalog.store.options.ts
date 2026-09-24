
import type { ToolkitDefinition } from '../../../toolkits/contracts/toolkit.definition.ts';

/** Describes the catalog store options contract. */
export interface CatalogStoreOptions {
  cwd?: string;
  manifestFile?: string;
  lockFile?: string;
  /** Toolkit catalog used when building the lock; defaults to Maia's built-in one. */
  toolkitCatalog?: readonly ToolkitDefinition[];
}
