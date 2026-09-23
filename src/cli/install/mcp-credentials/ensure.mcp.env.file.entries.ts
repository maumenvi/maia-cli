import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { MCPConfig } from '../../../agent/tools/contracts/mcp.config.ts';
import { collectReferencedEnvNames } from './collect.referenced.env.names.ts';
import { ensureEnvFileEntries } from './ensure.env.file.entries.ts';

/** Performs the ensure mcp env file entries operation. */
export function ensureMcpEnvFileEntries(store: AgentCatalogStore, config: MCPConfig | undefined): void {
  ensureEnvFileEntries(store.getPaths().mcpEnv, collectReferencedEnvNames(config));
}
