import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { resolveWorkspaceRoot } from './resolve.workspace.root.ts';

/** Performs the resolve tools dir operation. */
export function resolveToolsDir(store: Pick<AgentCatalogStore, 'getPaths'>): string {
  return path.resolve(resolveWorkspaceRoot(store), 'tools');
}
