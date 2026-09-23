/**
 * Result of attempting to gather agent selections for `maia init`. Distinguishes
 * "user was asked and explicitly chose to skip" (interactive TTY, empty answer)
 * from "no interactive terminal was available to ask" — the two cases FR-003 and
 * the 2026-09-21 clarification session require callers to treat differently.
 */
export type AgentSelectionOutcome =
  | { kind: 'selected'; agentIds: string[] }
  | { kind: 'skipped' }
  | { kind: 'non-interactive' };
