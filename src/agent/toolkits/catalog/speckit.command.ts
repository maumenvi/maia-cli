import type { ToolkitCommand } from '../contracts/toolkit.command.ts';
import type { ToolkitInstallContext } from '../contracts/toolkit.install.context.ts';
import { speckitGitSource } from './speckit.git.source.ts';

/**
 * Runs `specify` with the given arguments. Project scope uses an ephemeral
 * `uvx` environment so nothing is installed on the machine; global scope
 * uses the `specify` already placed on PATH by `uv tool install`.
 */
export function speckitCommand(context: ToolkitInstallContext, args: string[]): ToolkitCommand {
  if (context.scope === 'global') {
    return { command: 'specify', args };
  }
  return { command: 'uvx', args: ['--from', speckitGitSource(context), 'specify', ...args] };
}
