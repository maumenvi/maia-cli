import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import type { McpStdioServerOptions } from './mcp.stdio.server.options.ts';
import { McpStdioServer } from './stdio.ts';

/** Creates the aggregate Maia stdio MCP server. */
export function createMcpStdioServer(
  catalog: AgentCatalogStore,
  options?: McpStdioServerOptions,
): McpStdioServer {
  return new McpStdioServer(catalog, options);
}

