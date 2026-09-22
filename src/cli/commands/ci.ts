import { buildLockFromManifest } from '../../agent/catalog/lock/build.ts';
import { isLockStale } from '../../agent/catalog/lock/staleness/is-lock-stale.ts';
import type { CommandHandler } from '../contracts/command-handler.ts';
import { withRollback } from '../shared/rollback/install-rollback.ts';
import { reinstallFromLock } from '../shared/workspace/reinstall-from-lock.ts';
import { removeMaterializedFile } from '../shared/workspace/remove-materialized-file.ts';
import { assertLockfileVersionCompatible } from './assert-lockfile-version-compatible.ts';
import { formatLockVerificationProblems } from './format-lock-verification-problems.ts';
import { ensureInitialized } from './init/ensure-initialized.ts';
import { restoreConfiguredAgents } from './init/restore-configured-agents.ts';

/** Verifies existing artifacts before restoring missing lockfile materializations. */
export const ciCommand: CommandHandler = async (_args, { store }) => {
  ensureInitialized(store);

  const lock = store.loadLock();
  if (!lock) {
    throw new Error('maia.lock.json not found. Run "maia lock" first.');
  }

  assertLockfileVersionCompatible(lock.lockfileVersion);

  // The on-disk lockfile is CI's input, but it must still agree with the
  // manifest — a stale lock is a developer error that has to be reported,
  // never silently regenerated (FR-008). Built in memory only.
  const lockFromManifest = buildLockFromManifest(store.loadManifest(), store.getPaths().stateDir);
  if (isLockStale(lock, lockFromManifest)) {
    throw new Error(
      'maia.lock.json is out of date with maia.json. Run "maia lock" and commit the result. '
      + 'This can also happen when a source ref has moved since the lockfile was generated.',
    );
  }

  const preflight = store.verifyLock(lock, { allowMissingArtifacts: true });
  if (!preflight.ok) {
    throw new Error(formatLockVerificationProblems(preflight.problems));
  }

  const materialized: string[] = [];
  await withRollback([
    {
      run: async () => {
        const result = await reinstallFromLock(store, lock);
        materialized.push(...result.skills);
        return result;
      },
      undo: () => {
        for (const filePath of materialized) {
          removeMaterializedFile(filePath);
        }
      },
    },
  ]);

  const postflight = store.verifyLock(lock);
  if (!postflight.ok) {
    throw new Error(formatLockVerificationProblems(postflight.problems));
  }

  restoreConfiguredAgents(store);
  console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
  console.log(`Reinstalled ${materialized.length} skills and synced MCP config`);
};
