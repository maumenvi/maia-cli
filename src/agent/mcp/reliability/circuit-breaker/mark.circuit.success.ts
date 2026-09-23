import type { CircuitState } from '../contracts/circuit.state.ts';

/** Performs the mark circuit success operation. */
export function markCircuitSuccess(state: CircuitState): CircuitState {
  return {
    state: 'closed',
    consecutiveFailures: 0,
  };
}
