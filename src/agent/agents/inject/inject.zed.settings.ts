import type { AgentMcpServerConfig } from '../contracts/agent.mcp.server.config.ts';

/** Performs the inject zed settings operation. */
export function injectZedSettings(
  data: Record<string, unknown>,
  key: string,
  serverConfig: AgentMcpServerConfig,
): Record<string, unknown> {
  const existing = (data['context_servers'] ?? {}) as Record<string, unknown>;
  const entry = serverConfig.url
    ? { url: serverConfig.url, ...(serverConfig.headers ? { headers: serverConfig.headers } : {}) }
    : {
        command: {
          path: serverConfig.command,
          args: serverConfig.args ?? [],
          ...(serverConfig.env ? { env: serverConfig.env } : {}),
        },
      };
  return {
    ...data,
    context_servers: {
      ...existing,
      [key]: entry,
    },
  };
}
