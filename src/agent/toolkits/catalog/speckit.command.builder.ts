import type { ToolkitCommandBuilder } from '../contracts/toolkit.command.builder.ts';
import { speckitGitSource } from './speckit.git.source.ts';
import { speckitCommand } from './speckit.command.ts';

/** Builds GitHub Spec Kit's native commands (research D2). */
export const SPECKIT_COMMANDS: ToolkitCommandBuilder = {
  installGlobalTool: (context) => ({
    command: 'uv',
    args: ['tool', 'install', 'specify-cli', '--force', '--from', speckitGitSource(context)],
  }),
  initProject: (context, primaryIntegration) => speckitCommand(context, [
    'init',
    '--here',
    '--force',
    '--non-interactive',
    '--ignore-agent-tools',
    '--script',
    context.platform === 'win32' ? 'ps' : 'sh',
    ...(primaryIntegration ? ['--integration', primaryIntegration] : []),
  ]),
  addIntegration: (context, key) => speckitCommand(context, ['integration', 'install', key]),
  removeIntegration: (context, key) => speckitCommand(context, ['integration', 'uninstall', key]),
  globalToolVersion: () => ({ command: 'specify', args: ['--version'] }),
  uninstallGlobalToolHint: () => 'uv tool uninstall specify-cli',
};
