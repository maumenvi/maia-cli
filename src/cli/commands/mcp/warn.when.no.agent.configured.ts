import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';

/**
 * Returns a warning when an MCP was installed with no agent to receive it.
 *
 * Installing writes the manifest and the lockfile, so the command legitimately
 * reports success — but with no configured agent nothing injects the MCP into
 * an agent config, and the capability stays unreachable. Reporting only
 * "Installed" in that state reads as fully wired up and sends people looking
 * for a bug that is not there.
 */
export function warnWhenNoAgentConfigured(store: AgentCatalogStore): string | undefined {
  const agents = store.loadManifest().agents ?? {};
  if (Object.keys(agents).length > 0) return undefined;

  return 'No agent is configured, so this MCP is not reachable yet. '
    + 'Run "maia add agent <id>" (for example: claude) to wire it up.';
}
