import type { McpToolDescriptor } from './mcp.tool.descriptor.ts';

/** Contains the tools exposed by an MCP server. */
export interface McpListToolsResult {
  tools: McpToolDescriptor[];
  resultType?: 'complete';
  _meta?: Record<string, unknown>;
}

