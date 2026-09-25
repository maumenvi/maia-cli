import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { ToolkitDependency } from '../../../agent/catalog/types/dependencies/toolkit.dependency.ts';
import { withRollback } from '../../shared/rollback/install.rollback.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';

/**
 * Writes a toolkit to `maia.json` and `maia.lock.json` together, or neither
 * (FR-014), then refreshes the agents' instruction blocks.
 */
export async function recordToolkit(store: AgentCatalogStore, name: string, dependency: ToolkitDependency): Promise<void> {
  const previous = store.loadManifest().toolkits[name];
  const lockBefore = store.loadLock();
  await withRollback([
    {
      run: () => store.setToolkit(name, dependency),
      undo: () => (previous ? store.setToolkit(name, previous) : store.removeToolkit(name)),
    },
    {
      run: () => { store.buildLock(); },
      undo: () => { if (lockBefore) store.saveLock(lockBefore); },
    },
  ]);
  restoreConfiguredAgents(store);
}
