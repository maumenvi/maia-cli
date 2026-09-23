import { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';

/** Performs the get installed mcp config operation. */
export function getInstalledMcpConfig(catalog: AgentCatalogStore, serverName: string): MCPConfig {
  const installed = catalog.getInstalledPackages('mcp');
  const selected = installed.find((pkg) => pkg.name === serverName);
  if (!selected?.vscode) {
    throw new Error(`MCP server "${serverName}" is not installed or has no MCP config.`);
  }
  const config = selected.vscode;
  if (config.transport === 'http' && !config.url) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.url" for HTTP transport.`);
  }
  if (config.transport === 'sse' && !config.url) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.url" for SSE transport.`);
  }
  if (config.transport === 'ws' && !config.url) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.url" for WebSocket transport.`);
  }
  if (config.transport === 'npx' && !config.package) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.package" for npx transport.`);
  }
  if ((config.transport === 'stdio' || typeof config.transport === 'undefined') && !config.command) {
    throw new Error(`MCP server "${serverName}" requires a "vscode.command" for stdio transport.`);
  }
  return config;
}
