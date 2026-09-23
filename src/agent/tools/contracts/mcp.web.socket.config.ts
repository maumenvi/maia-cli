
/** Describes the mcp web socket config contract. */
export interface MCPWebSocketConfig {
  transport: 'ws';
  url: string;
  headers?: Record<string, string>;
}
