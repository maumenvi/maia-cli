import { buildLockFromManifest } from '../../agent/catalog/lock/build.ts';
import { isLockStale } from '../../agent/catalog/lock/staleness/is.lock.stale.ts';
import type { CommandHandler } from '../contracts/command.handler.ts';
import { withRollback } from '../shared/rollback/install.rollback.ts';
import { reinstallFromLock } from '../shared/workspace/reinstall.from.lock.ts';
import { removeMaterializedFile } from '../shared/workspace/remove.materialized.file.ts';
import { assertLockfileVersionCompatible } from './assert.lockfile.version.compatible.ts';
import { formatLockVerificationProblems } from './format.lock.verification.problems.ts';
import { ensureInitialized } from './init/ensure.initialized.ts';
import { defaultToolkitIo } from './toolkit/default.toolkit.io.ts';
import { restoreToolkits } from './toolkit/restore.toolkits.ts';
import type { ToolkitIo } from './toolkit/toolkit.io.ts';
import { verifyToolkits } from './toolkit/verify.toolkits.ts';
import { restoreConfiguredAgents } from './init/restore.configured.agents.ts';

/** Builds the ci command over the given toolkit side effects. */
export function createCiCommand(io: ToolkitIo): CommandHandler {
  return async (_args, { store }) => {
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
    const toolkitsInstalled: string[] = [];
    let undoToolkits = () => {};
    // Toolkits run inside the same rollback as skills/tools, so a toolkit
    // failure also undoes what this run materialized (research D15).
    await withRollback<unknown>([
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
      {
        run: () => {
          const result = restoreToolkits(store, lock, 'ci', io);
          undoToolkits = result.undo;
          toolkitsInstalled.push(...result.installed);
          return result;
        },
        undo: () => undoToolkits(),
      },
    ]);

    const postflight = store.verifyLock(lock);
    const problems = [
      ...(postflight.ok ? [] : postflight.problems),
      ...verifyToolkits(store, lock, io),
    ];
    if (problems.length > 0) {
      throw new Error(formatLockVerificationProblems(problems));
    }

    restoreConfiguredAgents(store);
    console.log(`Verified ${Object.keys(lock.packages).length} locked entries`);
    console.log(`Reinstalled ${materialized.length} skills and synced MCP config`);
    console.log(`Installed ${toolkitsInstalled.length} toolkits`);
  };
}

/** Verifies existing artifacts before restoring missing lockfile materializations. */
export const ciCommand: CommandHandler = createCiCommand(defaultToolkitIo);
