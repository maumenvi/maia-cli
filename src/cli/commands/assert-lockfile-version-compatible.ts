import { isLockfileVersionCompatible } from '../../agent/catalog/lock/schema/is-lockfile-version-compatible.ts';
import { LockfileVersionCompatibilityError } from './lockfile-version-compatibility-error.ts';

/** The lockfile schema version this CLI reads and writes. */
const SUPPORTED_LOCKFILE_VERSION = 1;

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
  if (!isLockfileVersionCompatible(lockfileVersion, SUPPORTED_LOCKFILE_VERSION)) {
    throw new LockfileVersionCompatibilityError(lockfileVersion, SUPPORTED_LOCKFILE_VERSION);
  }
}
