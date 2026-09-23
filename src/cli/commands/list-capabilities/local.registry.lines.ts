import { discoverRegistryEntries } from '../../../agent/catalog/registry/discover.ts';
import type { CatalogKind } from '../../../agent/catalog/types/kinds.ts';

/** Performs the local registry lines operation. */
export function localRegistryLines(kind: CatalogKind): string[] {
  return discoverRegistryEntries(kind, '', 10).map((entry) =>
    `${kind}:${entry.name} - ${entry.description}`,
  );
}
