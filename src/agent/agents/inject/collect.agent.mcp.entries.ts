import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';
import { mcpEntry } from '../registry/mcp.entry.ts';

/**
 * Build the MCP entries registered natively for one agent.
 *
 * Only the aggregating `maia` proxy is registered. Installed MCPs are reached
 * through it rather than being written into the agent config a second time:
 * a direct entry is spawned by the agent itself, which neither resolves the
 * `${env:...}` placeholders that credentials rely on — only Maia loads
 * `.maia/mcp.env` — nor inherits the shell that made its runtime resolvable,
 * producing spawn failures and a credential the server never receives.
 * Registering both also exposed every tool twice.
 */
export function collectAgentMcpEntries(_store: AgentCatalogStore, target: AgentTarget): AgentMcpEntry[] {
  return [mcpEntry(target.id, target.projectDir)];
}
