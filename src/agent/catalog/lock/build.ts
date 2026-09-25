import { TOOLKIT_CATALOG } from '../../toolkits/catalog/toolkit.catalog.ts';
import type { ToolkitDefinition } from '../../toolkits/contracts/toolkit.definition.ts';
import { buildToolkitLockEntries } from '../../toolkits/lock/build.toolkit.lock.entries.ts';
import { resolveSourceCommit } from '../manifest/source-hash/resolve.source.commit.ts';
import { findRegistryEntry } from '../registry/read/find.registry.entry.ts';
import { packageKey } from '../shared/hash/package.key.ts';
import { dependencySectionForKind } from '../shared/sections.ts';
import type { CatalogKind } from '../types/kinds.ts';
import type { SourceLock } from '../types/lock/source.lock.ts';
import type { SourcesManifest } from '../types/manifest/sources.manifest.ts';
import { createPackageDescriptor } from './package.descriptor.ts';

/** Performs the build lock from manifest operation. */
export function buildLockFromManifest(
  manifest: SourcesManifest,
  workspaceRoot = process.cwd(),
  toolkitCatalog: readonly ToolkitDefinition[] = TOOLKIT_CATALOG,
): SourceLock {
  const defaultAccessPolicy = manifest.config.llmAccessDefault;
  const strictVerify = manifest.config.strictVerify;
  const referencedSources = new Set([
    ...Object.values(manifest.skills),
    ...Object.values(manifest.mcps),
    ...Object.values(manifest.tools),
  ].map((dependency) => dependency.source));
  const sources: SourceLock['sources'] = {};
  for (const [alias, source] of Object.entries(manifest.sources)) {
    const resolvedCommit = resolveSourceCommit(alias, source);
    if (strictVerify && source.type === 'git' && referencedSources.has(alias) && !resolvedCommit.commitResolved) {
      throw new Error(`Unable to resolve commit for source "${alias}" while strictVerify is enabled`);
    }
    sources[alias] = {
      ...source,
      commit: resolvedCommit.commit,
      commitResolved: resolvedCommit.commitResolved,
    };
  }

  const packages: SourceLock['packages'] = {};
  const buildPackagesForKind = (kind: CatalogKind) => {
    const section = dependencySectionForKind(kind);
    for (const [name, dependency] of Object.entries(manifest[section])) {
      if (!(dependency.source in sources)) {
        throw new Error(`Unknown source "${dependency.source}" for ${kind} "${name}"`);
      }

      const sourceInfo = sources[dependency.source];
      const registryEntry = findRegistryEntry(kind, name);
      const descriptor = createPackageDescriptor(
        kind,
        name,
        dependency,
        sourceInfo,
        registryEntry,
        defaultAccessPolicy,
        workspaceRoot,
      );
      packages[packageKey(kind, name)] = descriptor;
    }
  };

  buildPackagesForKind('skill');
  buildPackagesForKind('mcp');
  buildPackagesForKind('tool');

  const agentIds = Object.keys(manifest.agents ?? {}).filter((id) => manifest.agents[id]?.enabled !== false);
  const toolkits = buildToolkitLockEntries(manifest.toolkits ?? {}, agentIds, toolkitCatalog);
  const hasToolkits = Object.keys(toolkits).length > 0;

  // Version 2 only when toolkits exist: an older CLI then fails loudly
  // instead of silently skipping them, while toolkit-free locks keep v1.
  return {
    name: manifest.name,
    lockfileVersion: hasToolkits ? 2 : 1,
    sources,
    packages,
    ...(hasToolkits ? { toolkits } : {}),
  };
}
