import { rmSync } from 'node:fs';
import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent-catalog-store.ts';
import { resolveTargets } from './resolve-targets.ts';

/**
 * Deletes a removed skill's native copy (`<skillsDir>/<name>/`) from every
 * configured agent that declares a `skillsDir`. `materializeAgentSkills` is
 * write-only — it never deletes a copy that should no longer exist — so
 * this closes that gap specifically for the removal flow (FR-006).
 */
export function removeNativeAgentSkillCopies(store: AgentCatalogStore, name: string): void {
  const manifest = store.loadManifest();
  const agentIds = Object.keys(manifest.agents ?? {});
  if (agentIds.length === 0) {
    return;
  }

  const cwd = store.getPaths().projectRoot;
  for (const target of resolveTargets(agentIds)) {
    if (!target.skillsDir) {
      continue;
    }
    const nativePath = path.resolve(target.skillsDir(cwd), name);
    rmSync(nativePath, { recursive: true, force: true });
  }
}
