import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { resolveToolsDir } from './resolve.tools.dir.ts';

/** Performs the resolve tool target path operation. */
export function resolveToolTargetPath(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, sourcePath: string): string {
  const extension = path.extname(sourcePath) === '.ts' ? '.ts' : '.mjs';
  return path.resolve(resolveToolsDir(store), `${name}${extension}`);
}
