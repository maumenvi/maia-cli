import type { LlmAccessPolicy } from '../../../access/policy/llm.access.policy.ts';

/** Describes the llm access policy provider contract. */
export interface LlmAccessPolicyProvider {
  /** Performs the get access policy operation. */
  getAccessPolicy(id: string): Required<LlmAccessPolicy>;
}
