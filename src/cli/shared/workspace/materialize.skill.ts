import { readFileSync } from 'node:fs';

import { resolveRuntimeModulePath } from '../../../agent/catalog/registry/runtime.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { assertMaterializedPath } from './assert.materialized.path.ts';
import { resolveSkillTargetPath } from './resolve.skill.target.path.ts';
import { resolveWorkspaceRoot } from './resolve.workspace.root.ts';
import { writeMaterializedFile } from './write.materialized.file.ts';

/** Performs the materialize skill operation. */
export function materializeSkill(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, targetRelativePath?: string): string {
  const sourcePath = resolveRuntimeModulePath('skill', name);
  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = targetRelativePath
    ? assertMaterializedPath(workspaceRoot, targetRelativePath, 'skill target path', 'skills')
    : resolveSkillTargetPath(store, name, sourcePath);
  writeMaterializedFile(workspaceRoot, targetPath, 'skill target path', readFileSync(sourcePath, 'utf8'));
  return targetPath;
}
