import type { ToolkitDependency } from '../../catalog/types/dependencies/toolkit.dependency.ts';
import type { LockToolkit } from '../../catalog/types/lock/lock.toolkit.ts';
import { findToolkit } from '../catalog/find.toolkit.ts';
import { TOOLKIT_CATALOG } from '../catalog/toolkit.catalog.ts';
import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import { collectToolkitPathPatterns } from '../plan/collect.toolkit.path.patterns.ts';
import { parseRequestedVersion } from '../plan/parse.requested.version.ts';
import { resolveToolkitIntegrations } from '../plan/resolve.toolkit.integrations.ts';

/**
 * Derives the lockfile's `toolkits` section from the manifest alone — no
 * network, no disk — so the lock stays a pure function of `maia.json`.
 */
export function buildToolkitLockEntries(
  toolkits: Record<string, ToolkitDependency>,
  agentIds: string[],
  catalog: readonly ToolkitDefinition[] = TOOLKIT_CATALOG,
): Record<string, LockToolkit> {
  const entries: Record<string, LockToolkit> = {};
  for (const name of Object.keys(toolkits).sort()) {
    const dependency = toolkits[name];
    const definition = findToolkit(name, catalog);
    if (!definition) {
      throw new Error(`Unknown toolkit "${name}" in maia.json (not in Maia's built-in catalog)`);
    }
    if (dependency.scope === 'global' && !definition.supportsGlobal) {
      throw new Error(`Toolkit "${name}" does not support global scope`);
    }
    const version = parseRequestedVersion(dependency.version);
    const { integrations } = resolveToolkitIntegrations(definition, agentIds);
    entries[name] = {
      name,
      version,
      scope: dependency.scope,
      source: definition.repository,
      ref: `v${version}`,
      integrations,
      paths: collectToolkitPathPatterns(definition, integrations),
    };
  }
  return entries;
}
