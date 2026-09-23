
/** Describes the mcp healthcheck result contract. */
export interface McpHealthcheckResult {
  serverName: string;
  ok: boolean;
  checkedAt: number;
  status: 'running' | 'failed';
  error?: string;
}
