import type { McpSession } from '../../runtime/contracts/mcp.session.ts';

/** Performs the invalidate session operation. */
export async function invalidateSession(
  sessions: Map<string, McpSession>,
  serverName: string,
): Promise<void> {
  const session = sessions.get(serverName);
  if (!session) return;
  sessions.delete(serverName);
  session.status = 'failed';
  await session.transport.close();
}
