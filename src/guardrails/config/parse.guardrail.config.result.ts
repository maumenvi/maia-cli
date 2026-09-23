import type { GuardrailConfig } from '../contracts/guardrail.config.ts';

/** Outcome of validating a raw `.maia/guardrails.json` payload. */
export type ParseGuardrailConfigResult =
  | { ok: true; config: GuardrailConfig }
  | { ok: false; reason: string };
