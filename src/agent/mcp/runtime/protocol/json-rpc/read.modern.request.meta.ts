import type { McpRequestMeta } from './mcp.request.meta.ts';

/** Reads and validates the required modern MCP metadata from request parameters. */
export function readModernRequestMeta(params: unknown): McpRequestMeta {
  if (!params || typeof params !== 'object') {
    throw new Error('Modern MCP requests require an object params field with _meta.');
  }
  const meta = (params as { _meta?: unknown })._meta;
  if (!meta || typeof meta !== 'object') {
    throw new Error('Modern MCP requests require params._meta.');
  }
  const candidate = meta as Partial<McpRequestMeta>;
  if (typeof candidate['io.modelcontextprotocol/protocolVersion'] !== 'string') {
    throw new Error('Modern MCP requests require io.modelcontextprotocol/protocolVersion.');
  }
  if (!candidate['io.modelcontextprotocol/clientCapabilities']
    || typeof candidate['io.modelcontextprotocol/clientCapabilities'] !== 'object') {
    throw new Error('Modern MCP requests require io.modelcontextprotocol/clientCapabilities.');
  }
  return candidate as McpRequestMeta;
}

