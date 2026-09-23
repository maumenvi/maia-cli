import type { SourceLock } from '../../types/lock/source.lock.ts';
import { computeLockIntegrity } from '../integrity/compute.lock.integrity.ts';
import type { LockVerificationProblem } from './lock.verification.problem.ts';

/**
 * Collects every metadata problem in a lockfile: recomputed integrity that
 * disagrees with the stored one, a package pointing at a source the lock
 * does not carry, or provenance/commit that diverges from that source.
 * Accumulates instead of throwing so callers can report all problems at
 * once (FR-002).
 */
export function verifySourceLockMetadata(lock: SourceLock): LockVerificationProblem[] {
  const problems: LockVerificationProblem[] = [];

  for (const [id, pkg] of Object.entries(lock.packages)) {
    const expected = computeLockIntegrity(pkg);
    if (pkg.integrity !== expected) {
      problems.push({ packageId: id, kind: 'metadata', message: `Integrity mismatch for ${id}` });
    }

    const source = lock.sources[pkg.source];
    if (!source) {
      problems.push({
        packageId: id,
        kind: 'metadata',
        message: `Missing locked source "${pkg.source}" for ${id}`,
      });
      continue;
    }

    const sourceRef = source.ref ?? 'main';
    const sourceTrusted = source.trusted ?? false;
    if (
      source.url !== pkg.provenance.repo
      || sourceRef !== pkg.provenance.ref
      || sourceTrusted !== pkg.provenance.trusted
      || (pkg.sourceCommit && source.commit !== pkg.sourceCommit)
    ) {
      problems.push({
        packageId: id,
        kind: 'metadata',
        message: `Source metadata mismatch for ${id}`,
      });
    }
  }

  return problems;
}
