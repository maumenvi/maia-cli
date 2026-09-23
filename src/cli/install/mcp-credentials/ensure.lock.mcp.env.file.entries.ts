import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { SourceLock } from '../../../agent/catalog/types/lock/source.lock.ts';
import { collectReferencedEnvNames } from './collect.referenced.env.names.ts';
import { ensureEnvFileEntries } from './ensure.env.file.entries.ts';

/** Performs the ensure lock mcp env file entries operation. */
export function ensureLockMcpEnvFileEntries(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  lock: SourceLock,
): void {
  const names = Object.values(lock.packages)
    .filter((pkg) => pkg.type === 'mcp')
    .flatMap((pkg) => collectReferencedEnvNames(pkg.vscode));
  ensureEnvFileEntries(store.getPaths().mcpEnv, names);
}
