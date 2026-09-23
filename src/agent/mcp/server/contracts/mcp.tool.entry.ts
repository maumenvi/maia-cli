
/** Describes the mcp tool entry contract. */
export interface McpToolEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** which maia package owns this tool: 'mcp:<server>', 'skill:<name>', 'tool:<name>' */
  origin: string;
}
