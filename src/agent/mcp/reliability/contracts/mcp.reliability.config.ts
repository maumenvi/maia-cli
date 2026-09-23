
/** Describes the mcp reliability config contract. */
export interface McpReliabilityConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  circuitFailureThreshold: number;
  circuitOpenMs: number;
  healthcheckIntervalMs: number;
}
