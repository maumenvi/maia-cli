import { ACCESS_ALL } from './access.all.ts';
import { ACCESS_DEFAULT_ALLOW } from './access.default.allow.ts';
import type { AccessDefaultPolicy } from './access.default.policy.ts';
import type { AccessResourceKind } from './access.resource.kind.ts';
import { keyByKind } from './key.by.kind.ts';
import { listAllowsValue } from './list.allows.value.ts';
import type { LlmAccessPolicy } from './llm.access.policy.ts';
import { normalizeLlmAccessPolicy } from './normalize.llm.access.policy.ts';
import { resolveAllowedLlms } from './resolve.allowed.llms.ts';

/** Performs the can llm access resource operation. */
export function canLlmAccessResource(
  llmId: string | undefined,
  kind: AccessResourceKind,
  resourceName: string,
  llmPolicy?: LlmAccessPolicy,
  resourceAllowedLlms?: string[],
  defaultPolicy: AccessDefaultPolicy = ACCESS_DEFAULT_ALLOW,
): boolean {
  const allowedLlms = resolveAllowedLlms(resourceAllowedLlms, defaultPolicy);
  if (!llmId) {
    return listAllowsValue(allowedLlms, ACCESS_ALL);
  }
  const normalizedPolicy = normalizeLlmAccessPolicy(llmPolicy);
  const allowedResources = normalizedPolicy[keyByKind[kind]];
  return listAllowsValue(allowedResources, resourceName) && listAllowsValue(allowedLlms, llmId);
}
