import { readFileSync } from 'node:fs';

import { resolveRuntimeModulePath } from '../../../agent/catalog/registry/runtime.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { assertMaterializedPath } from './assert.materialized.path.ts';
import { resolveToolTargetPath } from './resolve.tool.target.path.ts';
import { resolveWorkspaceRoot } from './resolve.workspace.root.ts';
import { writeMaterializedFile } from './write.materialized.file.ts';

/** Performs the materialize tool operation. */
export function materializeTool(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, targetRelativePath?: string): string {
  const sourcePath = resolveRuntimeModulePath('tool', name);
  const workspaceRoot = resolveWorkspaceRoot(store);
  const targetPath = targetRelativePath
    ? assertMaterializedPath(workspaceRoot, targetRelativePath, 'tool target path', 'tools')
    : resolveToolTargetPath(store, name, sourcePath);
  writeMaterializedFile(workspaceRoot, targetPath, 'tool target path', readFileSync(sourcePath, 'utf8'));
  return targetPath;
}
