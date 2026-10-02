#!/usr/bin/env node
import { AgentCatalogStore } from '../agent/catalog/store/agent.catalog.store.ts';
import { findProjectRoot } from '../config/core/find.project.root.ts';
import { helpCommand } from './commands/help.ts';
import { commandHandlers } from './commands/command.handlers.ts';
import { COMMAND_HELP } from './help/command.help.ts';
import { wantsHelp } from './help/wants.help.ts';
import type { CliContext } from './contracts/cli.context.ts';
import { GuardrailBlockedError } from './shared/guardrail/guardrail.blocked.error.ts';

const command = process.argv[2] ?? 'help';
const args = process.argv.slice(3);
const effectiveCommand = command === '--version' || command === '-v' ? 'version' : command;

/** Runs the requested command; help requests never reach a handler. */
async function main(): Promise<void> {
  // --help/-h is answered before the project is even located: reading help
  // must never search a catalog, install anything or write a file.
  if (wantsHelp([command, ...args])) {
    const lines = COMMAND_HELP[effectiveCommand];
    if (lines) {
      console.log(lines.join('\n'));
    } else {
      await helpCommand([], {} as CliContext);
    }
    return;
  }

  // Resolve the project from the working directory upwards, so running from a
  // subdirectory addresses the same project rather than starting a new one.
  const context: CliContext = {
    store: new AgentCatalogStore({ cwd: findProjectRoot(process.cwd()) ?? process.cwd() }),
  };

  const handler = commandHandlers[effectiveCommand] ?? helpCommand;
  await handler(args, context);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`maia: ${message}`);
  // A guardrail carries its own code so callers can tell a blocked action (1)
  // from a malformed policy (2); everything else is a generic failure.
  const exitCode = error instanceof GuardrailBlockedError ? error.exitCode : 1;
  process.exitCode = exitCode;
});
