/** Configures Maia's aggregate stdio MCP server identity and discovery behavior. */
export interface McpStdioServerOptions {
  name?: string;
  version?: string;
  dynamicDiscovery?: boolean;
  agentId?: string;
}
