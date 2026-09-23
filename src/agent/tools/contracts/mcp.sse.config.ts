
/** Describes the mcp sse config contract. */
export interface MCPSseConfig {
  transport: 'sse';
  url: string;
  headers?: Record<string, string>;
}
