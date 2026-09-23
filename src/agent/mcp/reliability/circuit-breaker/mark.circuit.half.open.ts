import type { CircuitState } from '../contracts/circuit.state.ts';

/** Performs the mark circuit half open operation. */
export function markCircuitHalfOpen(state: CircuitState): CircuitState {
  if (state.state !== 'open') return state;
  return {
    ...state,
    state: 'half-open',
  };
}
