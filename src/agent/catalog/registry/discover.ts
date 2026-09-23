import type { CatalogKind } from '../types/kinds.ts';
import type { RegistryEntry } from '../types/registry.ts';
import { readRegistry } from './read/read.registry.ts';

/** Performs the discover registry entries operation. */
export function discoverRegistryEntries(kind: CatalogKind, query = '', limit = 10): RegistryEntry[] {
  const entries = readRegistry(kind);
  const search = query.trim().toLowerCase();
  const filtered = search
    ? entries.filter((entry) => `${entry.name} ${entry.description}`.toLowerCase().includes(search))
    : entries;
  return filtered.slice(0, limit);
}
