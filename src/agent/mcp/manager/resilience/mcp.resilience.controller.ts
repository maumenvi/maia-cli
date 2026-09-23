import { computeBackoffMs } from '../../reliability/backoff/compute.backoff.ms.ts';
import { delay } from '../../reliability/backoff/delay.ts';
import { canAttemptCircuit } from '../../reliability/circuit-breaker/can.attempt.circuit.ts';
import { createClosedCircuit } from '../../reliability/circuit-breaker/create.closed.circuit.ts';
import { markCircuitFailure } from '../../reliability/circuit-breaker/mark.circuit.failure.ts';
import { markCircuitHalfOpen } from '../../reliability/circuit-breaker/mark.circuit.half.open.ts';
import { markCircuitSuccess } from '../../reliability/circuit-breaker/mark.circuit.success.ts';
import type { CircuitState } from '../../reliability/contracts/circuit.state.ts';
import type { McpOperationOptions } from '../../reliability/contracts/mcp.operation.options.ts';
import type { McpReliabilityConfig } from '../../reliability/contracts/mcp.reliability.config.ts';
import { getErrorMessage } from './get.error.message.ts';

/** Coordinates the mcp resilience controller behavior. */
export class McpResilienceController {
  private readonly circuits = new Map<string, CircuitState>();
  private readonly reliability: McpReliabilityConfig;

  /** Initializes a new McpResilienceController instance. */
  constructor(reliability: McpReliabilityConfig) {
    this.reliability = reliability;
  }

  /** Performs the describe circuits operation. */
  describeCircuits(): Array<{ serverName: string } & CircuitState> {
    return [...this.circuits.entries()].map(([serverName, circuit]) => ({ serverName, ...circuit }));
  }

  /** Performs the record success operation. */
  recordSuccess(serverName: string): void {
    const state = this.getCircuitState(serverName);
    this.circuits.set(serverName, markCircuitSuccess(state));
  }

  /** Performs the record failure operation. */
  recordFailure(serverName: string, errorMessage: string): void {
    const state = this.getCircuitState(serverName);
    const nextState = markCircuitFailure(state, errorMessage, Date.now(), this.reliability);
    this.circuits.set(serverName, nextState);
  }

  /** Performs the execute with resilience operation. */
  async executeWithResilience<T>(
    serverName: string,
    options: McpOperationOptions,
    operation: () => Promise<T>,
    onFailure: (error: unknown) => Promise<void>,
  ): Promise<T> {
    const retries = Math.max(0, options.retries ?? this.reliability.maxRetries);
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
      this.assertCircuitAllowsAttempt(serverName);
      try {
        const result = await operation();
        this.recordSuccess(serverName);
        return result;
      } catch (error) {
        lastError = error;
        const message = getErrorMessage(error);
        this.recordFailure(serverName, message);
        await onFailure(error);

        if (!this.shouldRetry(error, attempt, retries)) {
          throw error;
        }

        const backoffMs = computeBackoffMs(attempt, this.reliability);
        attempt += 1;
        await delay(backoffMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /** Performs the should retry operation. */
  private shouldRetry(error: unknown, attempt: number, retries: number): boolean {
    if (attempt >= retries) return false;
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes('circuit is open')) return false;
    if (message.includes('not installed') || message.includes('has no vs code command')) return false;
    if (message.includes('has no mcp config')) return false;
    if (message.includes('requires a "vscode.')) return false;
    if (message.includes('requires "vscode.')) return false;
    if (message.includes('requires "package"')) return false;
    return true;
  }

  /** Performs the assert circuit allows attempt operation. */
  private assertCircuitAllowsAttempt(serverName: string): void {
    const state = this.getCircuitState(serverName);
    const now = Date.now();
    const check = canAttemptCircuit(state, now);
    if (!check.allowed) {
      throw new Error(`MCP circuit is open for "${serverName}": ${check.reason ?? 'retry later'}`);
    }
    if (state.state === 'open') {
      this.circuits.set(serverName, markCircuitHalfOpen(state));
    }
  }

  /** Performs the get circuit state operation. */
  private getCircuitState(serverName: string): CircuitState {
    const state = this.circuits.get(serverName);
    if (state) return state;
    const created = createClosedCircuit();
    this.circuits.set(serverName, created);
    return created;
  }
}
