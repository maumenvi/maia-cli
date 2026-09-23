import { stableHash } from '../../shared/hash/stable.hash.ts';
import type { SourceLock } from '../../types/lock/source.lock.ts';
import { lockComparableProjection } from './lock.comparable.projection.ts';

/**
 * Reports whether the lockfile on disk no longer matches what the manifest
 * describes (FR-008). Compares only the manifest-derived projection of both
 * lockfiles — see `lockComparableProjection` for why `artifactHash` and
 * `integrity` must be excluded. Pure predicate: both lockfiles are already
 * in memory, nothing is read or written here.
 */
export function isLockStale(lockOnDisk: SourceLock, lockFromManifest: SourceLock): boolean {
  return stableHash(lockComparableProjection(lockOnDisk))
    !== stableHash(lockComparableProjection(lockFromManifest));
}
