import { formatGuardrailDecision } from '../../../guardrails/audit/format.guardrail.decision.ts';
import { loadGuardrailConfig } from '../../../guardrails/config/load.guardrail.config.ts';
import type { DestructiveActionKind } from '../../../guardrails/contracts/destructive.action.kind.ts';
import { evaluateGuardrail } from '../../../guardrails/policy/evaluate.guardrail.ts';
import { GuardrailBlockedError } from './guardrail.blocked.error.ts';

/**
 * Bridges a command to the guardrail policy (FR-008).
 *
 * Every enforcement point routes through here so the verdict for a given path
 * is identical whichever command asked. Throws rather than returning a value,
 * because callers must not be able to proceed by ignoring a return.
 *
 * `projectRoot` locates the config; `workspaceRoot` is what deny patterns are
 * matched against. They differ: materialized artifacts live under the state
 * directory, so a `tools/**` pattern must match relative to that, not to the
 * project root.
 */
export function assertPathAllowed(
  projectRoot: string,
  workspaceRoot: string,
  targetPath: string,
  kind: DestructiveActionKind,
  reason?: string,
): void {
  const loaded = loadGuardrailConfig(projectRoot);
  const decision = evaluateGuardrail(
    { kind, targetPath, reason },
    {
      workspaceRoot,
      config: loaded.state === 'loaded' ? loaded.config : undefined,
      malformed: loaded.state === 'malformed',
    },
  );

  if (decision.outcome === 'block') {
    const detail = loaded.state === 'malformed' ? `\n  (${loaded.reason})` : '';
    throw new GuardrailBlockedError(
      `${formatGuardrailDecision(decision)}${detail}`,
      loaded.state === 'malformed' ? 2 : 1,
    );
  }
}
