import type { DestructiveActionKind } from './destructive.action.kind.ts';

/**
 * A candidate action evaluated before it is allowed to run.
 *
 * `targetPath` is the only field that decides allow/block (FR-010); `kind` and
 * `reason` exist for the audit trail. There is no override field: a blocked
 * action has no runtime bypass (FR-009).
 */
export interface DestructiveAction {
  kind: DestructiveActionKind;
  targetPath: string;
  reason?: string;
}
