import type { SourceLock } from '../../types/lock/source.lock.ts';
import type { LockComparableProjection } from './lock.comparable.projection.type.ts';

/**
 * Projects a lockfile onto the fields the manifest determines, dropping
 * `artifactHash` and `integrity`.
 *
 * Those two depend on what is materialized on disk, not on the manifest:
 * `artifactHash` is only recorded when the file already exists at lock time,
 * and `integrity` is computed over a payload that includes it. Comparing
 * them would mark every clean CI checkout as stale — the committed lockfile
 * has hashes, a lockfile regenerated before materialization does not.
 */
export function lockComparableProjection(lock: SourceLock): LockComparableProjection {
  const packages: LockComparableProjection['packages'] = {};
  for (const [id, pkg] of Object.entries(lock.packages)) {
    const { artifactHash: _artifactHash, integrity: _integrity, ...comparable } = pkg;
    packages[id] = comparable;
  }

  return { name: lock.name, sources: lock.sources, packages };
}
