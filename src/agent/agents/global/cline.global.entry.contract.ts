/** Native entry schema used by Cline's global MCP settings. */
export interface ClineGlobalEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
  [key: string]: unknown;
}
