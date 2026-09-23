
/** Describes the mcp npx config contract. */
export interface MCPNpxConfig {
  transport: 'npx';
  package: string;
  args?: string[];
  env?: Record<string, string>;
  npxArgs?: string[];
}
