import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { configureAgents } from '../agent/configure.agents.ts';

/** Performs the restore configured agents operation. */
export async function restoreConfiguredAgents(
  store: AgentCatalogStore,
  interaction?: CliInteraction,
  offerGlobalRegistration = false,
): Promise<void> {
  const manifest = store.loadManifest();
  const ids = Object.keys(manifest.agents ?? {}).filter((id) => manifest.agents[id]?.enabled !== false);
  if (ids.length === 0) {
    return;
  }

  await configureAgents(store, ids, interaction, offerGlobalRegistration);
}
