import type { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import { AgentMcpManager } from '../../manager/manager/agent.mcp.manager.ts';
import type { McpToolEntry } from '../contracts/mcp.tool.entry.ts';
import { DEFAULT_SCHEMA } from './default.schema.ts';
import { toProxiedToolName } from './to.proxied.tool.name.ts';

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
            name: toProxiedToolName(pkg.name, tool.name),
            description: tool.description ?? `${pkg.name}: ${tool.name}`,
            inputSchema: (tool.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
            origin: `mcp:${pkg.name}`,
          });
        }
      } catch (error) {
        // The server is skipped so one broken MCP cannot hide every other tool,
        // but never silently: a swallowed error here looks identical to an MCP
        // that legitimately exposes nothing, which is undiagnosable. stderr is
        // safe to write to — stdout is the JSON-RPC channel — and the transport
        // has already redacted any credential value from the message.
        const reason = error instanceof Error ? error.message : String(error);
        process.stderr.write(`maia: MCP "${pkg.name}" is unavailable and was skipped: ${reason}\n`);
      }
    }),
  );

  return entries;
}
