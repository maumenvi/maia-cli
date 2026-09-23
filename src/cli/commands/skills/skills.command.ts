import type { CommandHandler } from '../../contracts/command.handler.ts';
import { runSkillsCli } from './run.skills.cli.ts';

/** Performs the skills command operation. */
export const skillsCommand: CommandHandler = async (args, context) => {
  const code = await runSkillsCli(args, undefined, false, context);
  if (code !== 0) {
    throw new Error(`skills CLI exited with code ${code}`);
  }
};
