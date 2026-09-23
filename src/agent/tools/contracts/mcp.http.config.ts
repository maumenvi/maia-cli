
/** Describes the mcp http config contract. */
export interface MCPHttpConfig {
  transport: 'http';
  url: string;
  headers?: Record<string, string>;
}
