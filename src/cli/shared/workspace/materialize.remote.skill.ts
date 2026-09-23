import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchRemoteSkillMarkdown } from '../remote-skill/fetch.remote.skill.markdown.ts';
import { assertMaterializedPath } from './assert.materialized.path.ts';
import { resolveWorkspaceRoot } from './resolve.workspace.root.ts';
import { writeMaterializedFile } from './write.materialized.file.ts';

/** Performs the materialize remote skill operation. */
export async function materializeRemoteSkill(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  name: string,
  source: CatalogSource,
  targetRelativePath = path.posix.join('skills', name, 'SKILL.md'),
): Promise<string> {
  // A source that cannot be reached and a source that answers but no longer
  // carries the skill are different failures: the first means "retry the
  // pipeline", the second means "fix the configuration" (FR-011). No retry
  // is attempted here.
  let markdown: string | null;
  try {
    markdown = await fetchRemoteSkillMarkdown(source, name);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Source ${source.url} is unreachable while fetching skill "${name}": ${reason}`);
  }

  if (markdown === null) {
    throw new Error(`Skill "${name}" was not found in ${source.url}`);
  }

  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = assertMaterializedPath(workspaceRoot, targetRelativePath, 'skill target path', 'skills');
  writeMaterializedFile(workspaceRoot, targetPath, 'skill target path', markdown);
  return targetPath;
}
