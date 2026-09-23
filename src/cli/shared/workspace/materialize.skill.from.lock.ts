import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { LockPackage } from '../../../agent/catalog/types/lock/lock.package.ts';
import { materializeSkill } from './materialize.skill.ts';

/** Performs the materialize skill from lock operation. */
export function materializeSkillFromLock(store: Pick<AgentCatalogStore, 'getPaths'>, pkg: Pick<LockPackage, 'name' | 'path'>): string {
  return materializeSkill(store, pkg.name, pkg.path);
}
