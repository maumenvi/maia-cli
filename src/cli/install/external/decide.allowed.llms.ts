import type { AllowedLlmsDecision } from './allowed.llms.decision.ts';

/**
 * Decides which agents may use a capability installed from the catalog.
 * Explicit flags always win; a trusted source is authorized for every agent;
 * an untrusted one needs consent — asked on a terminal, denied (empty list)
 * everywhere else.
 */
export function decideAllowedLlms(input: {
  trusted: boolean;
  flags: Record<string, string>;
  interactive: boolean;
}): AllowedLlmsDecision {
  const { trusted, flags, interactive } = input;
  if (flags['all-llms'] === 'true' || flags.allLlms === 'true') {
    return { allowedLlms: ['*'] };
  }
  const listed = (flags.llms ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (listed.length > 0) {
    return { allowedLlms: listed };
  }
  if (trusted) {
    return { allowedLlms: ['*'] };
  }
  return interactive ? { ask: true } : { allowedLlms: [] };
}
