import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { SourceLock } from '../../../agent/catalog/types/lock/source.lock.ts';
import { buildToolkitInstallCommands } from '../../../agent/toolkits/plan/build.toolkit.install.commands.ts';
import { normalizeToolkitVersion } from '../../../agent/toolkits/plan/normalize.toolkit.version.ts';
import { checkToolkitPrerequisites } from './check.toolkit.prerequisites.ts';
import { deleteToolkitPaths } from './delete.toolkit.paths.ts';
import { detectToolkitState } from './detect.toolkit.state.ts';
import { findToolkitOrThrow } from './find.toolkit.or.throw.ts';
import { rollbackNewToolkitPaths } from './rollback.new.toolkit.paths.ts';
import { runToolkitCommands } from './run.toolkit.commands.ts';
import { snapshotToolkitPaths } from './snapshot.toolkit.paths.ts';
import { toolkitMismatchMessage } from './toolkit.mismatch.message.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/**
 * Brings every locked toolkit to its pinned version for `maia i` / `maia ci`.
 * Never asks (FR-010b), never overwrites: a present toolkit at another
 * version is an error (Clarification 6). `undo` deletes what this run
 * created, so `ci` can roll it back together with skills and tools.
 */
export function restoreToolkits(
  store: AgentCatalogStore,
  lock: SourceLock,
  mode: 'install' | 'ci',
  io: ToolkitIo,
): { installed: string[]; undo: () => void } {
  const projectRoot = store.getPaths().projectRoot;
  const installed: string[] = [];
  const created: string[] = [];
  const undo = () => { deleteToolkitPaths(store, created, `maia ${mode} rollback`); };

  for (const entry of Object.values(lock.toolkits ?? {})) {
    const definition = findToolkitOrThrow(entry.name, io.catalog);
    const detected = detectToolkitState(definition, entry, projectRoot, io);
    if (detected.state === 'installed') continue;
    if (detected.state === 'mismatch') {
      const source = mode === 'ci' ? 'maia.lock.json' : 'maia.json';
      throw new Error(toolkitMismatchMessage(entry.name, detected.projectVersion ?? 'unknown', source, entry.version));
    }

    checkToolkitPrerequisites(definition, projectRoot, io);
    const globalToolReady = entry.scope === 'global'
      && detected.globalToolVersion !== null
      && normalizeToolkitVersion(detected.globalToolVersion) === entry.version;
    const commands = buildToolkitInstallCommands(definition, {
      version: entry.version,
      scope: entry.scope,
      integrations: entry.integrations,
      platform: io.platform,
      repository: entry.source,
      globalToolReady,
    }, detected.state);

    const before = snapshotToolkitPaths(projectRoot, entry.paths);
    const { failed } = runToolkitCommands(commands, projectRoot, false, io);
    if (failed) {
      rollbackNewToolkitPaths(store, before, entry.paths);
      throw new Error(`Toolkit ${entry.name} failed during ${mode}: exit ${failed.status}${failed.stderr ? `\n${failed.stderr.trim()}` : ''}`);
    }
    created.push(...[...snapshotToolkitPaths(projectRoot, entry.paths)].filter((path) => !before.has(path)));
    installed.push(entry.name);
  }

  return { installed, undo };
}
