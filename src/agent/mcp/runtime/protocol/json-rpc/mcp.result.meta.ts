import type { McpImplementation } from './mcp.implementation.ts';

/** Carries the server identity attached to modern MCP results. */
export interface McpResultMeta extends Record<string, unknown> {
  'io.modelcontextprotocol/serverInfo'?: McpImplementation;
}

