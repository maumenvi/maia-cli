import { canLlmAccessResource } from '../../access/policy/can.llm.access.resource.ts';
import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import type { LockPackage } from '../../catalog/types/lock/lock.package.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';

/** Returns the installed packages that are enabled and authorized for one agent. */
export function resolveAuthorizedPackages(store: AgentCatalogStore, target: AgentTarget): LockPackage[] {
  const defaultPolicy = store.getLlmAccessDefault();
  return store.getInstalledPackages().filter((pkg) => pkg.enabled && canLlmAccessResource(
    target.id,
    pkg.type,
    pkg.name,
    undefined,
    pkg.allowedLlms,
    defaultPolicy,
  ));
}
