import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseGuardrailConfig } from './parse.guardrail.config.ts';
import type { LoadedGuardrailConfig } from './loaded.guardrail.config.ts';

/**
 * Reads `.maia/guardrails.json` for a project.
 *
 * An absent file is the normal state of a project that never configured
 * anything and falls back to the built-in defaults, so it is not an error. A
 * file that exists but does not parse is reported as malformed, which callers
 * treat as fail-closed — a guardrail that fails open gives false confidence.
 */
export function loadGuardrailConfig(projectRoot: string): LoadedGuardrailConfig {
  const configPath = path.join(projectRoot, '.maia', 'guardrails.json');

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    return { state: 'absent' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    return { state: 'malformed', reason: error instanceof Error ? error.message : String(error) };
  }

  const parsed = parseGuardrailConfig(payload);
  return parsed.ok
    ? { state: 'loaded', config: parsed.config }
    : { state: 'malformed', reason: parsed.reason };
}
