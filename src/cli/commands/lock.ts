import { buildLockFromManifest } from '../../agent/catalog/lock/build.ts';
import type { CommandHandler } from '../contracts/command.handler.ts';

/** Performs the lock command operation. */
export const lockCommand: CommandHandler = async (_args, { store }) => {
  const lock = buildLockFromManifest(store.loadManifest(), store.getPaths().stateDir);
  const written = store.saveLock(lock);
  console.log(written ? 'Updated maia.lock.json' : 'maia.lock.json is already up to date');
};
