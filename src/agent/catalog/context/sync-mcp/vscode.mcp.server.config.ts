




/** Defines the vscode mcp server config type. */
export type VscodeMcpServerConfig =
  | { command: string; args?: string[]; env?: Record<string, string> }
  | { type: 'http' | 'sse' | 'ws'; url: string; headers?: Record<string, string> };
