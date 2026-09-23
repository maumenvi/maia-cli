import type { CommandHandler } from '../contracts/command.handler.ts';
import { assertLockfileVersionCompatible } from './assert.lockfile.version.compatible.ts';
import { formatLockVerificationProblems } from './format.lock.verification.problems.ts';

/** Performs the verify command operation. */
export const verifyCommand: CommandHandler = async (_args, { store }) => {
  const lock = store.loadLock();
  if (!lock) {
    throw new Error('maia.lock.json not found. Run "maia lock" first.');
  }

  assertLockfileVersionCompatible(lock.lockfileVersion);

  const result = store.verifyLock(lock);
  if (!result.ok) {
    throw new Error(formatLockVerificationProblems(result.problems));
  }

  console.log('maia.lock.json integrity OK');
};
