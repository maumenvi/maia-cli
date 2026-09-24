import path from 'node:path';

import { searchCatalog } from '../../../agent/catalog/providers/core/search.catalog.ts';
import { findRegistryEntry } from '../../../agent/catalog/registry/read/find.registry.entry.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { bestCatalogMatch } from '../../install/external/best.catalog.match.ts';
import { installCatalogResult } from '../../install/external/install.catalog.result.ts';
import { createMcpConfig } from '../../install/mcp/create.mcp.config.ts';
import { installMcp } from '../../install/mcp/install.mcp.ts';
import { installSkill } from '../../install/skill/install.skill.ts';
import { withRollback } from '../../shared/rollback/install.rollback.ts';
import { normalizeKind } from '../../shared/kind.ts';
import { materializeTool } from '../../shared/workspace/materialize.tool.ts';
import { removeMaterializedFile } from '../../shared/workspace/remove.materialized.file.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { hasManualMcpConfig } from './has.manual.mcp.config.ts';
import { resolveAllowedLlms } from './resolve.allowed.llms.ts';

/** Installs one named skill, MCP or tool. */
export async function installNamedCapability(
  store: AgentCatalogStore,
  positional: string[],
  flags: Record<string, string>,
): Promise<void> {

  const kind = normalizeKind(positional[0] ?? '');
  const name = positional[1];
  if (!name) {
    throw new Error(`Usage: maia i ${kind} <name> [--version <range>] [--source <alias>]`);
  }

  const version = flags.version ?? '*';
  const allowedLlms = resolveAllowedLlms(flags);
  const explicitSource = flags.source;

  if (kind === 'skill') {
    const isLocal = Boolean(findRegistryEntry('skill', name));
    if (!explicitSource && !isLocal) {
      const { results } = await searchCatalog(store.loadManifest(), 'skill', name, 10);
      const match = bestCatalogMatch(results, name);
      if (!match) {
        throw new Error(`Skill "${name}" was not found in configured catalogs`);
      }
      await installCatalogResult(store, match, allowedLlms);
    } else {
      await installSkill(store, {
        name,
        source: explicitSource ?? 'local',
        version,
        allowedLlms,
      });
    }
  } else if (kind === 'tool') {
    if (explicitSource && explicitSource !== 'local') {
      throw new Error('Tool installs only support the local registry');
    }
    const registryEntry = findRegistryEntry('tool', name);
    if (!registryEntry) {
      throw new Error(`Tool "${name}" is not available in the local registry`);
    }
    const lockBeforeInstall = store.loadLock();
    const targetPath = materializeTool(store, name);
    await withRollback([
      {
        run: () => targetPath,
        undo: () => removeMaterializedFile(targetPath),
      },
      {
        run: () => store.addDependency(kind, name, {
          version,
          source: 'local',
          enabled: true,
          capabilities: registryEntry.capabilities ?? [],
          constraints: [],
          allowedLlms,
          path: path.relative(store.getPaths().stateDir, targetPath).replaceAll('\\', '/'),
          inputSchema: registryEntry.inputSchema,
        }),
        undo: () => store.removeDependency(kind, name),
      },
      {
        run: () => store.buildLock(),
        undo: () => {
          if (lockBeforeInstall) {
            store.saveLock(lockBeforeInstall);
          }
        },
      },
    ]);
  } else if (kind === 'mcp') {
    if (!explicitSource && !hasManualMcpConfig(flags)) {
      const { results } = await searchCatalog(store.loadManifest(), 'mcp', name, 10);
      const match = bestCatalogMatch(results, name);
      if (!match) {
        throw new Error(`MCP "${name}" was not found in configured catalogs`);
      }
      await installCatalogResult(store, match, allowedLlms);
    } else {
      await installMcp(
        store,
        name,
        explicitSource ?? 'local',
        version,
        allowedLlms,
        createMcpConfig(name, flags),
      );
    }
  } else {
    store.addDependency(kind, name, {
      version,
      source: explicitSource ?? 'local',
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms,
    });
    store.buildLock();
  }

  restoreConfiguredAgents(store);
  console.log(`Installed ${kind}:${name}`);
}
