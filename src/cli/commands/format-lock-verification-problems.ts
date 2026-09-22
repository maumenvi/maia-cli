import type { LockVerificationProblem } from '../../agent/catalog/lock/verify/lock-verification-problem.ts';

/**
 * Renders every lockfile verification problem as one line, so a single run
 * shows the whole picture instead of only the first failure (FR-002).
 */
export function formatLockVerificationProblems(problems: LockVerificationProblem[]): string {
  const header = problems.length === 1
    ? 'maia.lock.json verification failed with 1 problem:'
    : `maia.lock.json verification failed with ${problems.length} problems:`;
  const lines = problems.map((problem) => `  - [${problem.kind}] ${problem.message}`);
  return [header, ...lines].join('\n');
}
