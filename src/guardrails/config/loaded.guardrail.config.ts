import type { GuardrailConfig } from '../contracts/guardrail.config.ts';

/** Result of reading a project's guardrail config from disk. */
export type LoadedGuardrailConfig =
  | { state: 'absent' }
  | { state: 'loaded'; config: GuardrailConfig }
  | { state: 'malformed'; reason: string };
