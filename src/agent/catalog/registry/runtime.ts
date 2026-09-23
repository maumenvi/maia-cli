import { existsSync } from 'node:fs';

import { normalizeRegistryPath } from '../manifest/runtime.path.ts';
import type { CatalogKind } from '../types/kinds.ts';
import { findRegistryEntry } from './read/find.registry.entry.ts';

/** Performs the resolve runtime module path operation. */
export function resolveRuntimeModulePath(kind: CatalogKind, name: string): string {
  const entry = findRegistryEntry(kind, name);
  if (!entry) {
    throw new Error(`${kind} "${name}" not found in registry`);
  }
  const normalized = normalizeRegistryPath(entry.path);
  if (existsSync(normalized)) {
    return normalized;
  }

  if (normalized.endsWith('.ts')) {
    const jsPath = `${normalized.slice(0, -3)}.js`;
    if (existsSync(jsPath)) {
      return jsPath;
    }
  }

  return normalized;
}
