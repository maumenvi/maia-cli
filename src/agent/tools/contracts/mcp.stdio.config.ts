
/** Describes the mcp stdio config contract. */
export interface MCPStdioConfig {
  transport?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
