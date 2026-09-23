import type { GuardrailDecision } from '../contracts/guardrail.decision.ts';

/**
 * Renders a guardrail decision for the audit trail.
 *
 * Both outcomes are formatted, not just blocks: Acceptance Scenario 6.2
 * requires a permitted destructive action to be auditable afterwards. Only
 * paths, patterns and variable names appear — never a credential value.
 */
export function formatGuardrailDecision(decision: GuardrailDecision): string {
  if (decision.outcome === 'allow') {
    return `ALLOW ${decision.action.kind} ${decision.action.targetPath}: ${decision.auditNote}`;
  }

  const lines = decision.violations.map((violation) => `  - ${violation.message}`);
  return [
    `BLOCK ${decision.action.kind} ${decision.action.targetPath}`,
    ...lines,
  ].join('\n');
}
