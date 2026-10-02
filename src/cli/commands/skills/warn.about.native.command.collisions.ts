import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { resolveTargets } from '../agent/resolve.targets.ts';
import { findNativeCommandCollisions } from './find.native.command.collisions.ts';

/** Warns when an installed skill shares its name with a built-in command of a configured agent. */
export function warnAboutNativeCommandCollisions(store: AgentCatalogStore, name: string): void {
  const manifest = store.loadManifest();
  const agentIds = Object.keys(manifest.agents ?? {}).filter((id) => manifest.agents[id]?.enabled !== false);
  if (agentIds.length === 0) return;
  for (const { agentName } of findNativeCommandCollisions(name, resolveTargets(agentIds))) {
    console.warn(
      `warning: skill "${name}" has the same name as the built-in /${name} command of ${agentName}; `
      + 'install it under another name with --as <name>.',
    );
  }
}
