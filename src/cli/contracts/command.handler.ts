import type { CliContext } from './cli.context.ts';

/** Defines the command handler type. */
export type CommandHandler = (args: string[], context: CliContext) => Promise<void>;
