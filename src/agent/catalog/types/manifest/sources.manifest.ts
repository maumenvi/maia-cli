import type { McpDependency } from '../dependencies/mcp.dependency.ts';
import type { SkillDependency } from '../dependencies/skill.dependency.ts';
import type { ToolDependency } from '../dependencies/tool.dependency.ts';
import type { CatalogSource } from '../source/catalog.source.ts';
import type { AgentManifestEntry } from './agent.manifest.entry.ts';
import type { CatalogRegistryConfig } from './catalog.registry.config.ts';

/** Describes the sources manifest contract. */
export interface SourcesManifest {
  name: string;
  version: string;
  maiaVersion: string;
  config: {
    registryStrategy: 'hybrid';
    strictVerify: boolean;
    llmAccessDefault: 'allow' | 'deny';
  };
  registries: Record<string, CatalogRegistryConfig>;
  sources: Record<string, CatalogSource>;
  skills: Record<string, SkillDependency>;
  mcps: Record<string, McpDependency>;
  tools: Record<string, ToolDependency>;
  agents: Record<string, AgentManifestEntry>;
}
