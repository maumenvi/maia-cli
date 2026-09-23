
/** Describes the agent mcp server config contract. */
export interface AgentMcpServerConfig {
  /** stdio / npx transport: executable to spawn. */
  command?: string;
  /** stdio / npx transport: arguments passed to `command`. */
  args?: string[];
  /** Environment variables forwarded to the spawned process. */
  env?: Record<string, string>;
  /** Working directory passed to the spawned process */
  cwd?: string;
  /** Remote transport kind for http / sse / ws MCP servers. */
  type?: 'http' | 'sse' | 'ws';
  /** Remote transport endpoint for http / sse / ws MCP servers. */
  url?: string;
  /** Headers sent with remote transport requests. */
  headers?: Record<string, string>;
}
