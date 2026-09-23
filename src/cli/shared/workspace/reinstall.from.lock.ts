import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { SourceLock } from '../../../agent/catalog/types/lock/source.lock.ts';
import { ensureLockMcpEnvFileEntries } from '../../install/mcp-credentials/ensure.lock.mcp.env.file.entries.ts';
import { assertMaterializedPath } from './assert.materialized.path.ts';
import { assertNoSymlinkTraversal } from './assert.no.symlink.traversal.ts';
import { materializeRemoteSkill } from './materialize.remote.skill.ts';
import { materializeSkillFromLock } from './materialize.skill.from.lock.ts';
import { materializeToolFromLock } from './materialize.tool.from.lock.ts';
import { resolveWorkspaceRoot } from './resolve.workspace.root.ts';

/** Performs the reinstall from lock operation. */
export async function reinstallFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, lock: SourceLock): Promise<{ skills: string[] }> {
  const workspaceRoot = resolveWorkspaceRoot(store);
  for (const pkg of Object.values(lock.packages)) {
    if (!pkg.enabled || !pkg.path) continue;
    if (pkg.type === 'skill') {
      const targetPath = assertMaterializedPath(workspaceRoot, pkg.path, 'skill target path', 'skills');
      assertNoSymlinkTraversal(workspaceRoot, targetPath, 'skill target path');
    }
    if (pkg.type === 'tool') {
      const targetPath = assertMaterializedPath(workspaceRoot, pkg.path, 'tool target path', 'tools');
      assertNoSymlinkTraversal(workspaceRoot, targetPath, 'tool target path');
    }
  }

  const skills = await Promise.all(
    Object.values(lock.packages)
      .filter((pkg) => pkg.type === 'skill' && pkg.enabled)
      .map(async (pkg) => {
        if (pkg.path.toLowerCase().endsWith('skill.md')) {
          const source = lock.sources[pkg.source];
          if (!source) {
            throw new Error(`Missing source "${pkg.source}" for skill "${pkg.name}"`);
          }
          return materializeRemoteSkill(
            store,
            pkg.name,
            {
              ...source,
              ref: source.type === 'git' ? source.commit : (source.ref ?? source.commit),
            },
            pkg.path,
          );
        }
        return materializeSkillFromLock(store, pkg);
      }),
  );
  const tools = await Promise.all(
    Object.values(lock.packages)
      .filter((pkg) => pkg.type === 'tool' && pkg.enabled)
      .map(async (pkg) => materializeToolFromLock(store, pkg)),
  );
  ensureLockMcpEnvFileEntries(store, lock);
  return { skills: [...skills, ...tools] };
}
