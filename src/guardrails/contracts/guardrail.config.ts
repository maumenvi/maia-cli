/**
 * Destructive-action policy of a project, stored in `.maia/guardrails.json`.
 *
 * `version` must be `1`; an unknown version is fail-closed. `denyPatterns` may
 * be empty, which adds no blocking beyond the built-in defaults. No override
 * field exists: a block is lifted only by editing the patterns (FR-009).
 */
export interface GuardrailConfig {
  version: number;
  denyPatterns: string[];
}
