import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { skillsProviderId } from './skills.provider.id.ts';

/** Performs the direct git hub result operation. */
export function directGitHubResult(store: AgentCatalogStore, target: string): CatalogSearchResult | null {
  const match = target.match(/^([^/]+\/[^/@]+)@([A-Za-z0-9._-]+)$/);
  if (!match) {
    return null;
  }
  const [, repository, name] = match;
  return {
    id: `${repository}/${name}`,
    kind: 'skill',
    name,
    displayName: name,
    provider: skillsProviderId(store),
    source: repository,
    install: { type: 'github', repository, skill: name },
  };
}
