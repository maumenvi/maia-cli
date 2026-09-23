import type { McpReliabilityConfig } from '../reliability/contracts/mcp.reliability.config.ts';

export const DEFAULT_RELIABILITY_CONFIG: McpReliabilityConfig = {
  maxRetries: 2,
  initialBackoffMs: 200,
  maxBackoffMs: 2_000,
  backoffMultiplier: 2,
  circuitFailureThreshold: 3,
  circuitOpenMs: 10_000,
  healthcheckIntervalMs: 30_000,
};
