import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchRemoteSkillFiles } from '../remote-skill/fetch.remote.skill.files.ts';
import { assertMaterializedPath } from './assert.materialized.path.ts';
import { mirrorSkillFolder } from './mirror.skill.folder.ts';
import { resolveWorkspaceRoot } from './resolve.workspace.root.ts';
import { writeMaterializedFile } from './write.materialized.file.ts';

/**
 * Materializes a remote skill into the workspace. The target is the skill
 * folder (`skills/<name>`), mirrored with every file the source publishes; a
 * lockfile from before skill folders points at `…/SKILL.md`, and then only
 * that file is restored so the old lock still verifies.
 */
export async function materializeRemoteSkill(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  name: string,
  source: CatalogSource,
  targetRelativePath = path.posix.join('skills', name),
): Promise<string> {
  // A source that cannot be reached and a source that answers but no longer
  // carries the skill are different failures: the first means "retry the
  // pipeline", the second means "fix the configuration" (FR-011). No retry
  // is attempted here.
  let files: Awaited<ReturnType<typeof fetchRemoteSkillFiles>>;
  try {
    files = await fetchRemoteSkillFiles(source, name);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (/unsafe path|size limit|Invalid skill name|truncated tree|digest/.test(reason)) throw error;
    throw new Error(`Source ${source.url} is unreachable while fetching skill "${name}": ${reason}`);
  }

  if (files === null) {
    throw new Error(`Skill "${name}" was not found in ${source.url}`);
  }

  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = assertMaterializedPath(workspaceRoot, targetRelativePath, 'skill target path', 'skills');
  if (targetRelativePath.toLowerCase().endsWith('skill.md')) {
    const skillMd = files.find((file) => file.path === 'SKILL.md');
    writeMaterializedFile(workspaceRoot, targetPath, 'skill target path', skillMd?.content ?? Buffer.alloc(0));
    return targetPath;
  }
  mirrorSkillFolder(workspaceRoot, targetPath, files, 'skill target path');
  return targetPath;
}
