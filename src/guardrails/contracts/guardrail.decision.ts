import type { DestructiveAction } from './destructive.action.ts';
import type { GuardrailViolation } from './guardrail.violation.ts';

/**
 * Outcome of evaluating a destructive action against a guardrail policy.
 *
 * A `block` always carries at least one violation, and violations are
 * aggregated rather than stopped at the first match. Both outcomes are
 * auditable afterwards.
 */
export type GuardrailDecision =
  | { outcome: 'allow'; action: DestructiveAction; auditNote: string }
  | { outcome: 'block'; action: DestructiveAction; violations: GuardrailViolation[] };
