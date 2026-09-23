import type { CommandHandler } from '../../contracts/command.handler.ts';

/** Performs the installed skill lines operation. */
export function installedSkillLines(store: Parameters<CommandHandler>[1]['store']): string[] {
  return store.getInstalledPackages('skill').map((entry) =>
    `skill:${entry.name}@${entry.version} source=${entry.source}`,
  );
}
