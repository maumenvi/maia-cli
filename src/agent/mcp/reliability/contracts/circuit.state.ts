import type { CircuitStateKind } from './circuit.state.kind.ts';

/** Describes the circuit state contract. */
export interface CircuitState {
  state: CircuitStateKind;
  consecutiveFailures: number;
  openedAt?: number;
  nextAttemptAt?: number;
  lastError?: string;
}
