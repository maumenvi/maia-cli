import type { CatalogRegistryConfig } from '../../types/manifest/catalog.registry.config.ts';
import type { CatalogProvider } from '../contracts/catalog.provider.ts';
import { GitHubSkillsProvider } from '../github-skills/git.hub.skills.provider.ts';
import { McpRegistryProvider } from '../mcp-registry/mcp.registry.provider.ts';
import { SkillsShProvider } from '../skills-sh/skills.sh.provider.ts';

/** Performs the create provider operation. */
export function createProvider(id: string, config: CatalogRegistryConfig): CatalogProvider {
  if (config.provider === 'skills.sh') {
    return new SkillsShProvider(id, config.url);
  }
  if (config.provider === 'github-skills') {
    return new GitHubSkillsProvider(id, config.url);
  }
  return new McpRegistryProvider(id, config.url);
}
