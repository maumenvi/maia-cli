import type { CatalogKind } from '../../types/kinds.ts';
import type { RegistryEntry } from '../../types/registry.ts';
import { readRegistry } from './read.registry.ts';

/** Performs the find registry entry operation. */
export function findRegistryEntry(kind: CatalogKind, name: string): RegistryEntry | undefined {
  const entries = readRegistry(kind);
  return entries.find((entry) => entry.name === name);
}
