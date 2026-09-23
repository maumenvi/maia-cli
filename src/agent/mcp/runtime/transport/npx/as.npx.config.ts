import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPNpxConfig } from '../../../../tools/contracts/mcp.npx.config.ts';

/** Performs the as npx config operation. */
export function asNpxConfig(config: MCPConfig): MCPNpxConfig {
  if (config.transport !== 'npx') {
    throw new Error('MCP npx transport requires config.transport="npx".');
  }
  if (!config.package) {
    throw new Error('MCP npx transport requires "package".');
  }
  return config;
}
