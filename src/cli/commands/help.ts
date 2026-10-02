import { COMMAND_HELP } from '../help/command.help.ts';
import type { CommandHandler } from '../contracts/command.handler.ts';

/** Prints every usage line once, in the order of the shared help table. */
export const helpCommand: CommandHandler = async () => {
  const lines = [...new Set(Object.values(COMMAND_HELP).flat())];
  console.log(lines.join('\n'));
};
