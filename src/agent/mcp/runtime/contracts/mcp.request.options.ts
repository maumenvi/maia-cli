/** Configures timeout and wire metadata for a single MCP request. */
export interface McpRequestOptions {
  timeoutMs?: number;
  protocolVersion?: string;
  headers?: Record<string, string>;
}

