import type { McpSession } from '../../runtime/contracts/mcp.session.ts';

/** Performs the stop session operation. */
export async function stopSession(
  sessions: Map<string, McpSession>,
  serverName: string,
  timeoutMs?: number,
): Promise<void> {
  const session = sessions.get(serverName);
  if (!session) return;
  try {
    await session.client.shutdown({ timeoutMs });
  } finally {
    await session.transport.close();
    session.status = 'stopped';
    sessions.delete(serverName);
  }
}
