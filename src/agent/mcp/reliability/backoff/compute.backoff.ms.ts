import type { McpReliabilityConfig } from '../contracts/mcp.reliability.config.ts';

/** Performs the compute backoff ms operation. */
export function computeBackoffMs(attempt: number, config: McpReliabilityConfig): number {
  const raw = config.initialBackoffMs * Math.pow(config.backoffMultiplier, Math.max(0, attempt));
  return Math.min(config.maxBackoffMs, Math.floor(raw));
}
