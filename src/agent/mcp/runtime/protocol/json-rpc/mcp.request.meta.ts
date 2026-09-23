import type { McpImplementation } from './mcp.implementation.ts';

/** Carries the required stateless MCP identity and capability envelope. */
export interface McpRequestMeta extends Record<string, unknown> {
  'io.modelcontextprotocol/protocolVersion': string;
  'io.modelcontextprotocol/clientInfo'?: McpImplementation;
  'io.modelcontextprotocol/clientCapabilities': Record<string, unknown>;
}

