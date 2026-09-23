import type { ParseGuardrailConfigResult } from './parse.guardrail.config.result.ts';

/** Only schema revision this build understands. */
const SUPPORTED_VERSION = 1;

/**
 * Validates a raw guardrail config payload.
 *
 * Returns a result instead of throwing so the caller decides what a bad config
 * means; every caller treats it as fail-closed (Decision 4), because a guardrail
 * that fails open is worse than none — the user believes they are protected.
 */
export function parseGuardrailConfig(payload: unknown): ParseGuardrailConfigResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, reason: 'guardrail config must be a JSON object' };
  }

  const { version, denyPatterns } = payload as { version?: unknown; denyPatterns?: unknown };

  if (version !== SUPPORTED_VERSION) {
    return { ok: false, reason: `unsupported guardrail config version: ${String(version)}` };
  }

  if (!Array.isArray(denyPatterns) || denyPatterns.some((entry) => typeof entry !== 'string')) {
    return { ok: false, reason: 'denyPatterns must be an array of strings' };
  }

  return { ok: true, config: { version: SUPPORTED_VERSION, denyPatterns: denyPatterns as string[] } };
}
