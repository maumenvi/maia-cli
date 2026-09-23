import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import { resolveAuthorizedPackages } from '../../../agent/agents/profiles/resolve.authorized.packages.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { writeMaterializedFile } from '../../shared/workspace/write.materialized.file.ts';

/**
 * Copy every skill authorized for one agent from the central `.maia` catalog
 * into the agent's native skills directory as `<name>/SKILL.md`. No-op for agents
 * that do not expose a native skills directory.
 */
export function materializeAgentSkills(store: AgentCatalogStore, target: AgentTarget): string[] {
  if (!target.skillsDir) {
    return [];
  }

  const projectRoot = store.getPaths().projectRoot;
  const skillsDir = target.skillsDir(projectRoot);
  const written: string[] = [];

  for (const pkg of resolveAuthorizedPackages(store, target)) {
    if (pkg.type !== 'skill' || !pkg.path) {
      continue;
    }
    const sourcePath = path.isAbsolute(pkg.path) ? pkg.path : path.resolve(store.getPaths().stateDir, pkg.path);
    if (!existsSync(sourcePath)) {
      continue;
    }
    const targetPath = path.resolve(skillsDir, pkg.name, 'SKILL.md');
    writeMaterializedFile(projectRoot, targetPath, 'agent skill path', readFileSync(sourcePath, 'utf8'));
    written.push(targetPath);
  }

  return written;
}
