import { existsSync, readFileSync } from 'node:fs';

import { safeParseJson } from '../../shared/json.ts';
import type { CatalogKind } from '../../types/kinds.ts';
import type { RegistryEntry } from '../../types/registry.ts';
import { registryFileForKind } from '../root/registry.file.for.kind.ts';

/** Performs the read registry operation. */
export function readRegistry(kind: CatalogKind): RegistryEntry[] {
  const registryPath = registryFileForKind(kind);
  if (!existsSync(registryPath)) {
    return [];
  }
  const parsed = safeParseJson<{ items?: RegistryEntry[] }>(readFileSync(registryPath, 'utf8'), registryPath);
  return Array.isArray(parsed.items) ? parsed.items : [];
}
