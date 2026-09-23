import type { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import { AgentMcpManager } from '../../manager/manager/agent.mcp.manager.ts';
import type { McpToolEntry } from '../contracts/mcp.tool.entry.ts';
import { DEFAULT_SCHEMA } from './default.schema.ts';

/** Collect tools from all enabled MCP servers by querying them via JSON-RPC. */
export async function collectMcpEntries(
  catalog: AgentCatalogStore,
  mcpManager: AgentMcpManager,
  agentId?: string,
): Promise<McpToolEntry[]> {
  const entries: McpToolEntry[] = [];

  const mcpPackages = catalog.getInstalledPackages('mcp').filter((p) => p.enabled && p.vscode);

  await Promise.allSettled(
    mcpPackages.map(async (pkg) => {
      try {
        const tools = await mcpManager.listTools(pkg.name, { llmId: agentId });
        for (const tool of tools) {
          entries.push({
            name: `${pkg.name}__${tool.name}`,
            description: tool.description ?? `${pkg.name}: ${tool.name}`,
            inputSchema: (tool.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
            origin: `mcp:${pkg.name}`,
          });
        }
      } catch {
        // Server unreachable at startup — skip silently; will retry on next list call
      }
    }),
  );

  return entries;
}
