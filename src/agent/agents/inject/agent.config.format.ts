





/** Defines the agent config format type. */
export type AgentConfigFormat =
  | 'mcp-servers'      // { mcpServers: { key: config } }  — Claude Desktop, Continue
  | 'servers'          // { servers: { key: config } }      — VS Code Copilot, Cursor, Cline
  | 'zed-settings'     // Zed settings.json merges under "context_servers"
  | 'toml-mcp-servers';
