import { stableHash } from '../../shared/hash/stable.hash.ts';
import type { LockPackage } from '../../types/lock/lock.package.ts';
import { createLockIntegrityPayload } from './create.lock.integrity.payload.ts';

/** Performs the compute lock integrity operation. */
export function computeLockIntegrity(pkg: LockPackage): string {
  return stableHash(createLockIntegrityPayload(pkg));
}
