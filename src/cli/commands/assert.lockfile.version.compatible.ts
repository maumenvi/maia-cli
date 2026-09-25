import { isLockfileVersionCompatible } from '../../agent/catalog/lock/schema/is.lockfile.version.compatible.ts';
import { LockfileVersionCompatibilityError } from './lockfile.version.compatibility.error.ts';

/** Lockfile schema versions this CLI reads: 1, and 2 when toolkits are pinned. */
const SUPPORTED_LOCKFILE_VERSIONS: readonly number[] = [1, 2];

/**
 * Throws `LockfileVersionCompatibilityError` when a lockfile declares a
 * version this CLI does not support (FR-010). A lockfile with no version
 * field is treated as the supported version, so lockfiles predating the
 * field are not rejected.
 */
export function assertLockfileVersionCompatible(lockfileVersion: number | undefined): void {
  if (lockfileVersion === undefined) {
    return;
  }
  if (!isLockfileVersionCompatible(lockfileVersion, SUPPORTED_LOCKFILE_VERSIONS)) {
    throw new LockfileVersionCompatibilityError(lockfileVersion, SUPPORTED_LOCKFILE_VERSIONS);
  }
}
