import { existsSync, readFileSync } from 'node:fs';

import type { CommandHandler } from '../contracts/command.handler.ts';
import { parseFlags } from '../shared/flags/parse.flags.ts';

/** Performs the context command operation. */
export const contextCommand: CommandHandler = async (args, { store }) => {
  const action = args[0] ?? 'build';
  if (action === 'build') {
    store.buildContexts();
    console.log('Generated .maia/context.dev.json and .maia/context.llm.json');
    return;
  }

  if (action === 'show') {
    const { flags } = parseFlags(args.slice(1));
    const target = flags.for ?? 'dev';
    const paths = store.getPaths();
    const filePath = target === 'llm' ? paths.contextLlm : paths.contextDev;
    // A read-only command must not silently write the project — report the
    // missing context with guidance instead, the same way verify does for a
    // missing lockfile (FR-006).
    if (!existsSync(filePath)) {
      throw new Error(`No ${target} context found at ${filePath}. Run "maia context build" first.`);
    }
    const content = readFileSync(filePath, 'utf8');
    console.log(content);
    return;
  }

  throw new Error(`Unknown context action "${action}". Use "build" or "show".`);
};
