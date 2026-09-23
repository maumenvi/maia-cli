import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';
import type { McpClient } from './mcp.client.ts';
import type { McpSessionStatus } from './mcp.session.status.ts';
import type { McpTransport } from './mcp.transport.ts';

/** Tracks a live MCP transport, client, health status, and installation config. */
export interface McpSession {
  serverName: string;
  config: MCPConfig;
  status: McpSessionStatus;
  startedAt: number;
  lastHealthcheckAt?: number;
  lastError?: string;
  client: McpClient;
  transport: McpTransport;
}
