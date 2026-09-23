import type { CommandHandler } from '../../contracts/command.handler.ts';

/** Performs the installed lines operation. */
export function installedLines(store: Parameters<CommandHandler>[1]['store']): string[] {
  return store.getInstalledPackages().map((entry) =>
    `${entry.type}:${entry.name}@${entry.version} source=${entry.source}`,
  );
}
