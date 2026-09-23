import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPHttpConfig } from '../../../../tools/contracts/mcp.http.config.ts';

/** Performs the as http config operation. */
export function asHttpConfig(config: MCPConfig): MCPHttpConfig {
  if (config.transport !== 'http') {
    throw new Error('MCP HTTP transport requires config.transport="http".');
  }
  return config;
}
