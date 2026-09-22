import type { LockVerificationProblem } from './lock-verification-problem.ts';

/**
 * Outcome of verifying a lockfile: either clean, or the complete list of
 * problems found. Verification never stops at the first problem, so callers
 * can report everything in one run (FR-002).
 */
export type LockVerificationResult =
  | { ok: true }
  | { ok: false; problems: LockVerificationProblem[] };
