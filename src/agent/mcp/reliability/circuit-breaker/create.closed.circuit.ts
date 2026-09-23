import type { CircuitState } from '../contracts/circuit.state.ts';

/** Performs the create closed circuit operation. */
export function createClosedCircuit(): CircuitState {
  return {
    state: 'closed',
    consecutiveFailures: 0,
  };
}
