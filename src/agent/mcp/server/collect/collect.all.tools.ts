import type { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import { AgentMcpManager } from '../../manager/manager/agent.mcp.manager.ts';
import type { McpToolEntry } from '../contracts/mcp.tool.entry.ts';
import { collectLocalEntries } from './collect.local.entries.ts';
import { collectMcpEntries } from './collect.mcp.entries.ts';
import { collectToolkitEntries } from './collect.toolkit.entries.ts';

/** Performs the collect all tools operation. */
export async function collectAllTools(
  catalog: AgentCatalogStore,
  mcpManager: AgentMcpManager,
  agentId?: string,
): Promise<McpToolEntry[]> {
  const [local, mcp] = await Promise.all([
    collectLocalEntries(catalog, agentId),
    collectMcpEntries(catalog, mcpManager, agentId),
  ]);
  return [...collectToolkitEntries(), ...local, ...mcp];
}
