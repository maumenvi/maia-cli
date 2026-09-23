import path from 'node:path';

import { removeAgentMcpEntry } from '../../agent/agents/inject/remove-agent-mcp-entry.ts';
import { resolveConfigPath } from '../../agent/agents/inject/resolve-config-path.ts';
import type { CommandHandler } from '../contracts/command-handler.ts';
import { normalizeKind } from '../shared/kind.ts';
import { assertPathAllowed } from '../shared/guardrail/assert.path.allowed.ts';
import { withRollback } from '../shared/rollback/install-rollback.ts';
import { removeEmptyFallbackDir } from '../shared/workspace/remove-empty-fallback-dir.ts';
import { removeMaterializedFile } from '../shared/workspace/remove-materialized-file.ts';
import { resolveExistingMaterializedPath } from '../shared/workspace/resolve-existing-materialized-path.ts';
import { resolveSkillsDir } from '../shared/workspace/resolve-skills-dir.ts';
import { resolveToolsDir } from '../shared/workspace/resolve-tools-dir.ts';
import { resolveWorkspaceRoot } from '../shared/workspace/resolve-workspace-root.ts';
import { removeNativeAgentSkillCopies } from './agent/remove-native-agent-artifacts.ts';
import { resolveTargets } from './agent/resolve-targets.ts';
import { restoreConfiguredAgents } from './init/restore-configured-agents.ts';

/** Performs the remove command operation. */
export const removeCommand: CommandHandler = async (args, { store }) => {
  const kind = normalizeKind(args[0] ?? '');
  const name = args[1];
  if (!name) {
    throw new Error(`Usage: maia rm ${kind} <name>`);
  }

  const manifest = store.loadManifest();
  const dependency = kind === 'skill'
    ? manifest.skills[name]
    : kind === 'mcp'
      ? manifest.mcps[name]
      : manifest.tools[name];
  const lockBeforeRemove = store.loadLock();
  const workspaceRoot = resolveWorkspaceRoot(store);

  let materializedPath: string | undefined;
  if (kind === 'skill') {
    materializedPath = resolveExistingMaterializedPath(workspaceRoot, dependency?.path, [
      path.posix.join('skills', `${name}.ts`),
      path.posix.join('skills', `${name}.js`),
      path.posix.join('skills', name),
    ]);
  } else if (kind === 'tool') {
    materializedPath = resolveExistingMaterializedPath(workspaceRoot, dependency?.path, [
      path.posix.join('tools', `${name}.mjs`),
      path.posix.join('tools', `${name}.ts`),
    ]);
  }

  // Consulted before withRollback, not as a step inside it: a failing step
  // triggers the rollback of earlier ones, but here there is nothing to undo —
  // the intent is to never start. An mcp has no materialized file, so there is
  // no path to evaluate in that case.
  if (materializedPath) {
    assertPathAllowed(
      store.getPaths().projectRoot,
      workspaceRoot,
      materializedPath,
      'file-delete',
      `maia remove ${kind} ${name}`,
    );
  }

  await withRollback([
    {
      run: () => store.removeDependency(kind, name),
      undo: () => {
        if (dependency) {
          store.addDependency(kind, name, dependency);
        }
      },
    },
    {
      run: () => store.buildLock(),
      undo: () => {
        if (lockBeforeRemove) {
          store.saveLock(lockBeforeRemove);
        }
      },
    },
    {
      run: () => {
        if (materializedPath) {
          removeMaterializedFile(materializedPath);
        }
        if (kind === 'skill') {
          removeEmptyFallbackDir(resolveSkillsDir(store));
          removeNativeAgentSkillCopies(store, name);
        } else if (kind === 'tool') {
          removeEmptyFallbackDir(resolveToolsDir(store));
        } else if (kind === 'mcp') {
          const cwd = store.getPaths().projectRoot;
          const agentIds = Object.keys(store.loadManifest().agents ?? {});
          if (agentIds.length > 0) {
            for (const target of resolveTargets(agentIds)) {
              removeAgentMcpEntry(target, resolveConfigPath(target, cwd), name);
            }
          }
        }
        if (kind === 'mcp' || kind === 'skill') {
          restoreConfiguredAgents(store);
        }
      },
      // The final artifact-removal step has no meaningful undo of its own:
      // it is always the last step, so it never leaves a subsequent step to
      // fail after it. A materialized file deletion is not un-deletable in
      // general (its original content is not retained here).
      undo: () => {},
    },
  ]);

  console.log(`Removed ${kind}:${name}`);
};
