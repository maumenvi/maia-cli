import { existsSync, readFileSync, statSync } from 'node:fs';

import type { SourceLock } from '../../types/lock/source.lock.ts';
import type { VerifySourceLockOptions } from '../verify.source.lock.options.ts';
import { fingerprintFile } from './fingerprint.file.ts';
import type { LockVerificationProblem } from './lock.verification.problem.ts';
import type { LockVerificationResult } from './lock.verification.result.ts';
import { resolvePackagePath } from './resolve.package.path.ts';
import { verifySourceLockMetadata } from './verify.source.lock.metadata.ts';

/**
 * Verifies lock metadata and materialized artifacts without modifying the
 * workspace. Scans every package and returns the complete list of problems
 * rather than stopping at the first one (FR-002), so a single run shows the
 * whole picture. A materialized package with no recorded `artifactHash` is
 * itself a problem: the lockfile is incomplete and cannot vouch for that
 * artifact's content.
 */
export function verifySourceLock(
  lock: SourceLock,
  workspaceRoot = process.cwd(),
  options: VerifySourceLockOptions = {},
): LockVerificationResult {
  const problems: LockVerificationProblem[] = [...verifySourceLockMetadata(lock)];

  for (const [id, pkg] of Object.entries(lock.packages)) {
    if (!pkg.path) {
      continue;
    }

    const resolvedPath = resolvePackagePath(workspaceRoot, pkg.path);
    if (!existsSync(resolvedPath)) {
      if (pkg.artifactHash && !options.allowMissingArtifacts) {
        problems.push({
          packageId: id,
          kind: 'missing-artifact',
          message: `Materialized package missing for ${id} at ${pkg.path}`,
        });
      }
      continue;
    }

    const fileInfo = statSync(resolvedPath);
    if (!fileInfo.isFile()) {
      continue;
    }

    if (pkg.artifactHash) {
      const actual = fingerprintFile(resolvedPath);
      if (actual !== pkg.artifactHash) {
        problems.push({
          packageId: id,
          kind: 'hash-mismatch',
          message: `Artifact hash mismatch for ${id}`,
        });
      }
      continue;
    }

    const contents = readFileSync(resolvedPath, 'utf8');
    if (contents.length === 0) {
      problems.push({
        packageId: id,
        kind: 'empty-artifact',
        message: `Materialized package is empty for ${id} at ${pkg.path}`,
      });
      continue;
    }

    problems.push({
      packageId: id,
      kind: 'missing-artifact-hash',
      message: `No recorded artifact hash for ${id} at ${pkg.path}; the lockfile is incomplete. Run "maia lock" to regenerate it.`,
    });
  }

  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}
