/** Contains content returned by an MCP tool invocation. */
export interface McpCallToolResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  resultType?: 'complete' | 'task';
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

