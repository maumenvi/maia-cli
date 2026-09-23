import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';
import type { McpTransport } from '../contracts/mcp.transport.ts';
import { McpHttpTransport } from './http/mcp.http.transport.ts';
import { McpNpxTransport } from './npx/mcp.npx.transport.ts';
import { McpSseTransport } from './sse/mcp.sse.transport.ts';
import { McpStdioTransport } from './stdio/mcp.stdio.transport.ts';
import { McpWebSocketTransport } from './ws/mcp.web.socket.transport.ts';

/** Performs the create mcp transport operation. */
export function createMcpTransport(config: MCPConfig, defaultTimeoutMs = 15_000): McpTransport {
  if (config.transport === 'http') {
    return new McpHttpTransport(config, defaultTimeoutMs);
  }
  if (config.transport === 'sse') {
    return new McpSseTransport(config, defaultTimeoutMs);
  }
  if (config.transport === 'npx') {
    return new McpNpxTransport(config, defaultTimeoutMs);
  }
  if (config.transport === 'ws') {
    return new McpWebSocketTransport(config, defaultTimeoutMs);
  }
  return new McpStdioTransport(config, defaultTimeoutMs);
}
