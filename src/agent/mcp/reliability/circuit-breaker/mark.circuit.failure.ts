import type { CircuitState } from '../contracts/circuit.state.ts';
import type { McpReliabilityConfig } from '../contracts/mcp.reliability.config.ts';

/** Performs the mark circuit failure operation. */
export function markCircuitFailure(
  state: CircuitState,
  errorMessage: string,
  now: number,
  config: McpReliabilityConfig,
): CircuitState {
  const nextFailures = state.consecutiveFailures + 1;
  if (nextFailures >= config.circuitFailureThreshold) {
    return {
      state: 'open',
      consecutiveFailures: nextFailures,
      openedAt: now,
      nextAttemptAt: now + config.circuitOpenMs,
      lastError: errorMessage,
    };
  }
  return {
    state: 'closed',
    consecutiveFailures: nextFailures,
    lastError: errorMessage,
  };
}
