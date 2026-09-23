import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPWebSocketConfig } from '../../../../tools/contracts/mcp.web.socket.config.ts';

/** Performs the as web socket config operation. */
export function asWebSocketConfig(config: MCPConfig): MCPWebSocketConfig {
  if (config.transport !== 'ws') {
    throw new Error('MCP WebSocket transport requires config.transport="ws".');
  }
  if (!config.url) {
    throw new Error('MCP WebSocket transport requires "url".');
  }
  return config;
}
