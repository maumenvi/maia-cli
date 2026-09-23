import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { LockPackage } from '../../../agent/catalog/types/lock/lock.package.ts';
import { materializeTool } from './materialize.tool.ts';

/** Performs the materialize tool from lock operation. */
export function materializeToolFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, pkg: Pick<LockPackage, 'name' | 'path'>): string {
  return materializeTool(store, pkg.name, pkg.path);
}
