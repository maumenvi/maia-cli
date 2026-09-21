import { existsSync } from 'node:fs';
import path from 'node:path';

import type { CommandHandler } from '../contracts/command-handler.ts';
import { normalizeKind } from '../shared/kind.ts';
import { removeEmptyFallbackDir } from '../shared/workspace/remove-empty-fallback-dir.ts';
import { removeMaterializedFile } from '../shared/workspace/remove-materialized-file.ts';
import { resolveSkillsDir } from '../shared/workspace/resolve-skills-dir.ts';
import { resolveWorkspaceRoot } from '../shared/workspace/resolve-workspace-root.ts';

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

  store.removeDependency(kind, name);
  store.buildLock();

  if (kind === 'skill') {
    const workspaceRoot = resolveWorkspaceRoot(store);
    const relativePaths = dependency?.path
      ? [dependency.path]
      : [
          path.posix.join('skills', `${name}.ts`),
          path.posix.join('skills', `${name}.js`),
          path.posix.join('skills', name),
        ];
    for (const relativePath of relativePaths) {
      const targetPath = path.resolve(workspaceRoot, relativePath);
      if (existsSync(targetPath)) {
        removeMaterializedFile(targetPath);
        break;
      }
    }
    removeEmptyFallbackDir(resolveSkillsDir(store));
  }

  if (kind === 'mcp') {
    store.syncVsCodeMcp();
  }

  console.log(`Removed ${kind}:${name}`);
};
