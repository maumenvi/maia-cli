/** Describes a single problem found while verifying a lockfile. */
export interface LockVerificationProblem {
  packageId: string;
  kind: 'metadata' | 'missing-artifact' | 'hash-mismatch' | 'missing-artifact-hash' | 'empty-artifact' | 'toolkit';
  message: string;
}
