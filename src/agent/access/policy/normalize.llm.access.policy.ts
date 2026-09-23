import type { LlmAccessPolicy } from './llm.access.policy.ts';
import { normalizeAccessList } from './normalize.access.list.ts';

/** Performs the normalize llm access policy operation. */
export function normalizeLlmAccessPolicy(policy?: LlmAccessPolicy): Required<LlmAccessPolicy> {
  return {
    tools: normalizeAccessList(policy?.tools, []),
    skills: normalizeAccessList(policy?.skills, []),
    mcps: normalizeAccessList(policy?.mcps, []),
  };
}
