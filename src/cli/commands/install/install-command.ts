import path from 'node:path';

import { searchCatalog } from '../../../agent/catalog/providers/core/search-catalog.ts';
import { findRegistryEntry } from '../../../agent/catalog/registry/read/find-registry-entry.ts';
import type { CommandHandler } from '../../contracts/command-handler.ts';
import { bestCatalogMatch } from '../../install/external/best-catalog-match.ts';
import { installCatalogResult } from '../../install/external/install-catalog-result.ts';
import { createMcpConfig } from '../../install/mcp/create-mcp-config.ts';
import { installMcp } from '../../install/mcp/install-mcp.ts';
import { installSkill } from '../../install/skill/install-skill.ts';
import { withRollback } from '../../shared/rollback/install-rollback.ts';
import { parseFlags } from '../../shared/flags/parse-flags.ts';
import { normalizeKind } from '../../shared/kind.ts';
import { materializeTool } from '../../shared/workspace/materialize-tool.ts';
import { reinstallFromLock } from '../../shared/workspace/reinstall-from-lock.ts';
import { removeMaterializedFile } from '../../shared/workspace/remove-materialized-file.ts';
import { ensureInitialized } from '../init/ensure-initialized.ts';
import { restoreConfiguredAgents } from '../init/restore-configured-agents.ts';
import { hasManualMcpConfig } from './has-manual-mcp-config.ts';
import { resolveAllowedLlms } from './resolve-allowed-llms.ts';

/** Performs the install command operation. */
export const installCommand: CommandHandler = async (args, { store }) => {
  ensureInitialized(store);
  const { positional, flags } = parseFlags(args);

  if (positional.length === 0) {
    const lock = store.buildLock();
    const result = await reinstallFromLock(store, lock);
    restoreConfiguredAgents(store);
    console.log(`Bootstrapped maia.lock.json with ${Object.keys(lock.packages).length} locked entries`);
    console.log(`Installed ${result.skills.length} skills and synced MCP config`);
    return;
  }

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
};
