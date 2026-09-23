import type { AgentMcpServerConfig } from '../contracts/agent.mcp.server.config.ts';

/** Performs the inject mcp servers operation. */
export function injectMcpServers(
  data: Record<string, unknown>,
  key: string,
  serverConfig: AgentMcpServerConfig,
  topKey: string,
): Record<string, unknown> {
  const existing = (data[topKey] ?? {}) as Record<string, unknown>;
  return {
    ...data,
    [topKey]: {
      ...existing,
      [key]: serverConfig,
    },
  };
}
