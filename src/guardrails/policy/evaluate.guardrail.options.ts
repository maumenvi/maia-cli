import type { GuardrailConfig } from '../contracts/guardrail.config.ts';

/**
 * Policy input for one evaluation.
 *
 * `malformed` is distinct from an absent config: absent is the normal state of
 * a project that never configured anything and falls back to the defaults,
 * while malformed means someone wrote a file that does not parse.
 */
export interface EvaluateGuardrailOptions {
  config?: GuardrailConfig;
  malformed?: boolean;
  workspaceRoot: string;
}
