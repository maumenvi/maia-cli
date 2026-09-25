import path from 'node:path';

import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { DestructiveActionKind } from '../../../guardrails/contracts/destructive.action.kind.ts';
import { assertPathAllowed } from '../../shared/guardrail/assert.path.allowed.ts';
import { GuardrailBlockedError } from '../../shared/guardrail/guardrail.blocked.error.ts';
import { listPathsUnder } from './list.paths.under.ts';

/** Exit code the guardrail uses for a malformed policy. */
const MALFORMED_POLICY_EXIT_CODE = 2;

/**
 * Splits toolkit paths into those the guardrail allows and those it blocks.
 * A directory is blocked when it or anything inside it is blocked, since the
 * native tool would touch the whole tree. A malformed policy is rethrown:
 * it blocks everything, never a partial subset.
 */
export function assertToolkitPathsAllowed(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  relativePaths: Iterable<string>,
  kind: DestructiveActionKind,
  reason: string,
): { allowed: string[]; blocked: string[] } {
  const projectRoot = store.getPaths().projectRoot;
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const relativePath of relativePaths) {
    const targets = listPathsUnder(path.resolve(projectRoot, relativePath));
    try {
      for (const target of targets) {
        assertPathAllowed(projectRoot, projectRoot, target, kind, reason);
      }
      allowed.push(relativePath);
    } catch (error) {
      if (!(error instanceof GuardrailBlockedError) || error.exitCode === MALFORMED_POLICY_EXIT_CODE) {
        throw error;
      }
      blocked.push(relativePath);
    }
  }
  return { allowed, blocked };
}
