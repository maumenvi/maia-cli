import { mkdirSync, writeFileSync } from 'node:fs';

import { normalizeAccessList } from '../../access/policy/normalize.access.list.ts';
import type { SourceLock } from '../types/lock/source.lock.ts';
import type { CatalogStorePaths } from '../types/store/catalog.store.paths.ts';

/** Performs the build catalog contexts operation. */
export function buildCatalogContexts(paths: CatalogStorePaths, lock: SourceLock) {
  const dev = {
    generatedAt: new Date().toISOString(),
    manifest: paths.manifest,
    lock: paths.lock,
    packages: Object.values(lock.packages),
  };
  const llm = {
    generatedAt: dev.generatedAt,
    entries: Object.values(lock.packages).map((pkg) => ({
      id: `${pkg.type}:${pkg.name}`,
      type: pkg.type,
      enabled: pkg.enabled,
      capabilities: pkg.capabilities,
      allowedLlms: normalizeAccessList(pkg.allowedLlms),
      invoke: pkg.type === 'mcp'
        ? { transport: 'vscode-mcp', ...(pkg.vscode ?? {}) }
        : { name: pkg.name },
      constraints: pkg.constraints,
      provenance: pkg.provenance,
    })),
  };

  mkdirSync(paths.contextDir, { recursive: true });
  writeFileSync(paths.contextDev, `${JSON.stringify(dev, null, 2)}\n`, 'utf8');
  writeFileSync(paths.contextLlm, `${JSON.stringify(llm, null, 2)}\n`, 'utf8');
  return { dev, llm };
}
