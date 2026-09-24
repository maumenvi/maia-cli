import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { withRollback } from '../../shared/rollback/install.rollback.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { assertToolkitPathsAllowed } from './assert.toolkit.paths.allowed.ts';
import { deleteToolkitPaths } from './delete.toolkit.paths.ts';
import { findToolkitOrThrow } from './find.toolkit.or.throw.ts';
import { snapshotToolkitPaths } from './snapshot.toolkit.paths.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/**
 * `maia toolkit rm`: drops the toolkit from manifest and lock, then asks
 * whether to delete its files (default no, FR-024). Native uninstalls only
 * run for integrations whose paths the guardrail allows, and the global
 * tool is never uninstalled (FR-025, research D11).
 */
export async function removeToolkit(
  store: AgentCatalogStore,
  request: { name: string; yes: boolean },
  io: ToolkitIo,
): Promise<void> {
  const dependency = store.loadManifest().toolkits[request.name];
  if (!dependency) {
    throw new Error(`Toolkit "${request.name}" is not installed`);
  }
  const definition = findToolkitOrThrow(request.name, io.catalog);
  const lockBefore = store.loadLock();
  const entry = lockBefore?.toolkits?.[request.name];
  const projectRoot = store.getPaths().projectRoot;

  await withRollback([
    { run: () => store.removeToolkit(request.name), undo: () => store.setToolkit(request.name, dependency) },
    { run: () => { store.buildLock(); }, undo: () => { if (lockBefore) store.saveLock(lockBefore); } },
  ]);
  console.log(`Removed toolkit:${request.name}`);

  const existing = [...snapshotToolkitPaths(projectRoot, entry?.paths ?? definition.projectPaths)];
  if (existing.length > 0) {
    console.log(`Files: ${existing.join(', ')}`);
    const confirmed = request.yes || await io.confirm('Delete these files? Edits will be lost. [y/N]');
    if (!confirmed) {
      console.log(`Kept: ${existing.join(', ')}`);
    } else {
      const blocked: string[] = [];
      const context = {
        version: dependency.version,
        scope: dependency.scope,
        integrations: entry?.integrations ?? [],
        platform: io.platform,
        repository: definition.repository,
      };
      for (const key of context.integrations) {
        const paths = snapshotToolkitPaths(projectRoot, definition.integrationPaths[key] ?? []);
        const check = assertToolkitPathsAllowed(store, paths, 'file-delete', `maia toolkit rm ${request.name}`);
        if (check.blocked.length > 0) {
          blocked.push(...check.blocked);
          continue;
        }
        const result = io.runner(definition.commands.removeIntegration(context, key), { cwd: projectRoot, interactive: true });
        if (result.status !== 0) {
          console.warn(`warning: native uninstall of integration "${key}" failed (exit ${result.status})`);
        }
      }
      const remaining = [...snapshotToolkitPaths(projectRoot, entry?.paths ?? definition.projectPaths)]
        .filter((path) => !blocked.includes(path));
      const { deleted, blocked: blockedPaths } = deleteToolkitPaths(store, remaining, `maia toolkit rm ${request.name}`);
      blocked.push(...blockedPaths);
      if (deleted.length > 0) console.log(`Deleted: ${deleted.join(', ')}`);
      for (const path of blocked) console.log(`Blocked by guardrail, kept: ${path}`);
    }
  }

  if (dependency.scope === 'global') {
    console.log(`Global tool kept. To uninstall: ${definition.commands.uninstallGlobalToolHint()}`);
  }
  restoreConfiguredAgents(store);
}
