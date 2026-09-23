import type { McpImplementation } from './mcp.implementation.ts';

/** Contains the negotiated stateful MCP revision and server metadata. */
export interface McpInitializeResult {
  protocolVersion?: string;
  serverInfo?: McpImplementation;
  capabilities?: Record<string, unknown>;
}

