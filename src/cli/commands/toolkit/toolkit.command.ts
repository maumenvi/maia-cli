import type { CommandHandler } from '../../contracts/command.handler.ts';
import { parseFlags } from '../../shared/flags/parse.flags.ts';
import { ensureInitialized } from '../init/ensure.initialized.ts';
import { defaultToolkitIo } from './default.toolkit.io.ts';
import { installToolkit } from './install.toolkit.ts';
import { listToolkits } from './list.toolkits.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** Builds the `maia toolkit` handler over the given side effects. */
export function createToolkitCommand(io: ToolkitIo): CommandHandler {
  return async (args, { store }) => {
    const { positional, flags } = parseFlags(args);
    const [subcommand, name] = positional;
    ensureInitialized(store);

    if (subcommand === 'i' || subcommand === 'install') {
      if (!name) {
        throw new Error('Usage: maia toolkit i <name> [-g] [--version <x.y.z>] [-y]');
      }
      await installToolkit(store, {
        name,
        version: flags.version,
        global: flags.global === 'true',
        yes: flags.yes === 'true',
      }, io);
      return;
    }

    if (subcommand === 'ls' || subcommand === 'list') {
      listToolkits(store, { json: flags.json === 'true' }, io);
      return;
    }

    throw new Error('Usage: maia toolkit i|install|ls|rm <name>');
  };
}

/** `maia toolkit` with the real process, terminal and network. */
export const toolkitCommand: CommandHandler = createToolkitCommand(defaultToolkitIo);
