import type { McpReliabilityConfig } from '../../reliability/contracts/mcp.reliability.config.ts';
import type { McpSession } from '../../runtime/contracts/mcp.session.ts';

/** Performs the ensure healthy session operation. */
export async function ensureHealthySession(
  session: McpSession,
  reliability: McpReliabilityConfig,
  timeoutMs?: number,
): Promise<void> {
  if (
    typeof session.lastHealthcheckAt === 'number'
    && Date.now() - session.lastHealthcheckAt < reliability.healthcheckIntervalMs
  ) {
    return;
  }
  await session.client.listTools({ timeoutMs });
  session.lastHealthcheckAt = Date.now();
}
