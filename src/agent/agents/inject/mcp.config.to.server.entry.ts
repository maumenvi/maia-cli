import type { MCPConfig } from '../../tools/contracts/mcp.config.ts';
import type { AgentMcpServerConfig } from '../contracts/agent.mcp.server.config.ts';

/**
 * Convert a catalog `MCPConfig` (as stored in the lock's `vscode` field) into the
 * neutral server entry that the per-format config injectors understand.
 */
export function mcpConfigToServerEntry(name: string, config: MCPConfig): AgentMcpServerConfig {
  if (config.transport === 'http' || config.transport === 'sse' || config.transport === 'ws') {
    if (!config.url) {
      throw new Error(`MCP "${name}" is missing a URL for ${config.transport} transport`);
    }
    return {
      type: config.transport,
      url: config.url,
      ...(config.headers && Object.keys(config.headers).length > 0 ? { headers: config.headers } : {}),
    };
  }

  if (config.transport === 'npx') {
    if (!config.package) {
      throw new Error(`MCP "${name}" is missing a package for npx transport`);
    }
    return {
      command: 'npx',
      args: [...(config.npxArgs ?? ['-y']), config.package, ...(config.args ?? [])],
      ...(config.env && Object.keys(config.env).length > 0 ? { env: config.env } : {}),
    };
  }

  if (!config.command) {
    throw new Error(`MCP "${name}" is missing a command for stdio transport`);
  }
  return {
    command: config.command,
    ...(config.args && config.args.length > 0 ? { args: config.args } : {}),
    ...(config.env && Object.keys(config.env).length > 0 ? { env: config.env } : {}),
  };
}
