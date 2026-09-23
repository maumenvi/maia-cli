import { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import { JsonRpcMcpClient } from '../../runtime/client/json-rpc-client/json.rpc.mcp.client.ts';
import type { McpSession } from '../../runtime/contracts/mcp.session.ts';
import { createMcpTransport } from '../../runtime/transport/factory.ts';
import { toErrorMessage } from '../resilience/to.error.message.ts';
import { getInstalledMcpConfig } from './get.installed.mcp.config.ts';
import { invalidateSession } from './invalidate.session.ts';

/** Performs the get or start session operation. */
export async function getOrStartSession(
  catalog: AgentCatalogStore,
  sessions: Map<string, McpSession>,
  serverName: string,
  timeoutMs?: number,
): Promise<McpSession> {
  const existing = sessions.get(serverName);
  if (existing?.status === 'running' && existing.transport.isOpen()) {
    return existing;
  }

  if (existing) {
    await invalidateSession(sessions, serverName);
  }

  const config = getInstalledMcpConfig(catalog, serverName);
  const transport = createMcpTransport(config, timeoutMs ?? 15_000);
  const client = new JsonRpcMcpClient(transport);
  const session: McpSession = {
    serverName,
    config,
    status: 'starting',
    startedAt: Date.now(),
    client,
    transport,
  };
  sessions.set(serverName, session);

  try {
    await client.initialize({ timeoutMs });
    session.status = 'running';
    session.lastHealthcheckAt = Date.now();
    return session;
  } catch (error) {
    session.status = 'failed';
    session.lastError = toErrorMessage(error);
    await transport.close();
    sessions.delete(serverName);
    throw error;
  }
}
