import type { CircuitState } from '../contracts/circuit.state.ts';

/** Performs the can attempt circuit operation. */
export function canAttemptCircuit(state: CircuitState, now: number): { allowed: boolean; reason?: string } {
  if (state.state !== 'open') {
    return { allowed: true };
  }
  if (typeof state.nextAttemptAt !== 'number') {
    return { allowed: false, reason: 'circuit is open' };
  }
  if (now >= state.nextAttemptAt) {
    return { allowed: true };
  }
  return { allowed: false, reason: `circuit is open until ${new Date(state.nextAttemptAt).toISOString()}` };
}
