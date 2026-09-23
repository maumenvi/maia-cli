import { ACCESS_ALL } from './access.all.ts';
import { ACCESS_DEFAULT_ALLOW } from './access.default.allow.ts';
import { ACCESS_DEFAULT_DENY } from './access.default.deny.ts';
import type { AccessDefaultPolicy } from './access.default.policy.ts';
import { normalizeAccessList } from './normalize.access.list.ts';

/** Performs the resolve allowed llms operation. */
export function resolveAllowedLlms(
  allowedLlms: string[] | undefined,
  defaultPolicy: AccessDefaultPolicy = ACCESS_DEFAULT_ALLOW,
): string[] {
  if (Array.isArray(allowedLlms)) {
    return normalizeAccessList(allowedLlms, []);
  }
  return defaultPolicy === ACCESS_DEFAULT_DENY ? [] : [ACCESS_ALL];
}
