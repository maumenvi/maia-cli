import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { resolveSkillsDir } from './resolve.skills.dir.ts';

/** Performs the resolve skill target path operation. */
export function resolveSkillTargetPath(store: Pick<AgentCatalogStore, 'getPaths'>, name: string, sourcePath: string): string {
  const extension = path.extname(sourcePath) || '.ts';
  return path.resolve(resolveSkillsDir(store), `${name}${extension}`);
}
