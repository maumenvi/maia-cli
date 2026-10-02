import type { AgentCatalogStore } from '../../agent/catalog/store/agent.catalog.store.ts';
import type { CliInteraction } from './cli.interaction.ts';

/** Describes the cli context contract. */
export interface CliContext {
  store: AgentCatalogStore;
  /** Terminal interactions; defaults to the real terminal when omitted. */
  interaction?: CliInteraction;
}
