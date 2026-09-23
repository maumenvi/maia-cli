import type { DestructiveAction } from '../contracts/destructive.action.ts';
import type { GuardrailDecision } from '../contracts/guardrail.decision.ts';
import type { GuardrailViolation } from '../contracts/guardrail.violation.ts';
import { DEFAULT_DENY_PATTERNS } from './default.deny.patterns.ts';
import type { EvaluateGuardrailOptions } from './evaluate.guardrail.options.ts';
import { matchDenyPattern } from './match.deny.pattern.ts';
import { toWorkspaceRelativePath } from './to.workspace.relative.path.ts';

/**
 * Decides whether a destructive action may proceed.
 *
 * The verdict comes from the target path alone (FR-010); the action's `kind`
 * reaches the audit trail but never the decision. There is no override: no
 * token, flag or confirmation turns a block into an allow (FR-009), so the only
 * way to permit a blocked path is to edit the deny list.
 *
 * Violations are aggregated rather than stopped at the first match, matching
 * how feature 004 reports lock problems.
 */
export function evaluateGuardrail(
  action: DestructiveAction,
  options: EvaluateGuardrailOptions,
): GuardrailDecision {
  const violations: GuardrailViolation[] = [];

  const relativePath = toWorkspaceRelativePath(action.targetPath, options.workspaceRoot);
  if (typeof relativePath === 'undefined') {
    return {
      outcome: 'block',
      action,
      violations: [{
        pattern: '<outside-workspace>',
        targetPath: action.targetPath,
        message: `Path resolves outside the workspace root: ${action.targetPath}`,
      }],
    };
  }

  if (options.malformed) {
    return {
      outcome: 'block',
      action,
      violations: [{
        pattern: '<malformed-config>',
        targetPath: relativePath,
        message: 'Guardrail config is present but malformed; blocking every destructive action.',
      }],
    };
  }

  const patterns = [...DEFAULT_DENY_PATTERNS, ...(options.config?.denyPatterns ?? [])];
  for (const pattern of patterns) {
    if (matchDenyPattern(relativePath, pattern)) {
      violations.push({
        pattern,
        targetPath: relativePath,
        message: `Path "${relativePath}" matches deny pattern "${pattern}".`,
      });
    }
  }

  if (violations.length > 0) {
    return { outcome: 'block', action, violations };
  }

  return {
    outcome: 'allow',
    action,
    auditNote: `${action.kind} allowed for "${relativePath}"`,
  };
}
