import type { CommandHandler } from '../contracts/command.handler.ts';
import { normalizeKind } from '../shared/kind.ts';

/** Performs the list command operation. */
export const listCommand: CommandHandler = async (args, { store }) => {
  const rawKind = args[0];
  const kind = rawKind ? normalizeKind(rawKind) : undefined;
  const installed = store.getInstalledPackages(kind);
  if (!installed.length) {
    console.log('No installed entries.');
    return;
  }

  for (const entry of installed) {
    console.log(`${entry.type}:${entry.name}@${entry.version} source=${entry.source}`);
  }
};
