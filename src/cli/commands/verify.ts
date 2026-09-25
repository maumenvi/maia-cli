import type { CommandHandler } from '../contracts/command.handler.ts';
import { assertLockfileVersionCompatible } from './assert.lockfile.version.compatible.ts';
import { formatLockVerificationProblems } from './format.lock.verification.problems.ts';
import { defaultToolkitIo } from './toolkit/default.toolkit.io.ts';
import type { ToolkitIo } from './toolkit/toolkit.io.ts';
import { verifyToolkits } from './toolkit/verify.toolkits.ts';

/** Builds the verify command over the given toolkit side effects. */
export function createVerifyCommand(io: ToolkitIo): CommandHandler {
  return async (_args, { store }) => {
    const lock = store.loadLock();
    if (!lock) {
      throw new Error('maia.lock.json not found. Run "maia lock" first.');
    }

    assertLockfileVersionCompatible(lock.lockfileVersion);

    const result = store.verifyLock(lock);
    const problems = [...(result.ok ? [] : result.problems), ...verifyToolkits(store, lock, io)];
    if (problems.length > 0) {
      throw new Error(formatLockVerificationProblems(problems));
    }

    console.log('maia.lock.json integrity OK');
  };
}

/** Performs the verify command operation. */
export const verifyCommand: CommandHandler = createVerifyCommand(defaultToolkitIo);
