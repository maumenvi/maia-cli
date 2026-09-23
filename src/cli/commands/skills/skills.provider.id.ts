import { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { SKILL_REGISTRY_PROVIDERS } from './skill.registry.providers.ts';

/** Performs the skills provider id operation. */
export function skillsProviderId(store: AgentCatalogStore): string {
  const entry = Object.entries(store.loadManifest().registries)
    .find(([, config]) => SKILL_REGISTRY_PROVIDERS.has(config.provider));
  if (!entry) {
    throw new Error('No skill registry is configured in sources');
  }
  return entry[0];
}
