import type { LockVerificationProblem } from './lock.verification.problem.ts';

/** Names every file of a skill folder that is missing, changed or not in the lockfile. */
export function compareSkillFiles(
  packageId: string,
  expected: Record<string, string>,
  actual: Record<string, string>,
): LockVerificationProblem[] {
  const problems: LockVerificationProblem[] = [];
  for (const [file, hash] of Object.entries(expected)) {
    if (!(file in actual)) {
      problems.push({ packageId, kind: 'missing-file', message: `File missing for ${packageId}: ${file}` });
    } else if (actual[file] !== hash) {
      problems.push({ packageId, kind: 'changed-file', message: `File changed for ${packageId}: ${file}` });
    }
  }
  for (const file of Object.keys(actual)) {
    if (!(file in expected)) {
      problems.push({ packageId, kind: 'unexpected-file', message: `Unexpected file for ${packageId}: ${file}` });
    }
  }
  return problems;
}
