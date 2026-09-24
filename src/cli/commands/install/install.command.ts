import type { CommandHandler } from '../../contracts/command.handler.ts';
import { parseFlags } from '../../shared/flags/parse.flags.ts';
import { reinstallFromLock } from '../../shared/workspace/reinstall.from.lock.ts';
import { ensureInitialized } from '../init/ensure.initialized.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { defaultToolkitIo } from '../toolkit/default.toolkit.io.ts';
import { restoreToolkits } from '../toolkit/restore.toolkits.ts';
import type { ToolkitIo } from '../toolkit/toolkit.io.ts';
import { installNamedCapability } from './install.named.capability.ts';

/** Builds the install command over the given toolkit side effects. */
export function createInstallCommand(io: ToolkitIo): CommandHandler {
  return async (args, { store }) => {
    ensureInitialized(store);
    const { positional, flags } = parseFlags(args);

    if (positional.length === 0) {
      const lock = store.buildLock();
      const result = await reinstallFromLock(store, lock);
      const toolkits = restoreToolkits(store, lock, 'install', io);
      restoreConfiguredAgents(store);
      console.log(`Bootstrapped maia.lock.json with ${Object.keys(lock.packages).length} locked entries`);
      console.log(`Installed ${result.skills.length} skills and synced MCP config`);
      console.log(`Installed ${toolkits.installed.length} toolkits`);
      return;
    }

    await installNamedCapability(store, positional, flags);
  };
}

/** Performs the install command operation. */
export const installCommand: CommandHandler = createInstallCommand(defaultToolkitIo);
