import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPSseConfig } from '../../../../tools/contracts/mcp.sse.config.ts';

/** Performs the as sse config operation. */
export function asSseConfig(config: MCPConfig): MCPSseConfig {
  if (config.transport !== 'sse') {
    throw new Error('MCP SSE transport requires config.transport="sse".');
  }
  return config;
}
