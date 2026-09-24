import type { ToolkitCommand } from '../contracts/toolkit.command.ts';
import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import type { ToolkitInstallContext } from '../contracts/toolkit.install.context.ts';
import type { ToolkitInstallState } from '../contracts/toolkit.install.state.ts';

/**
 * Lists the native commands that bring a toolkit from `state` to installed.
 * Global scope installs the tool first (unless it is already at the wanted
 * version) and then initializes the project; project scope only initializes.
 */
export function buildToolkitInstallCommands(
  definition: ToolkitDefinition,
  context: ToolkitInstallContext,
  state: ToolkitInstallState = 'absent',
): ToolkitCommand[] {
  const { commands } = definition;
  const needsGlobalTool = context.scope === 'global' && !context.globalToolReady;
  if (state === 'global-tool-missing') {
    return [commands.installGlobalTool(context)];
  }

  const [primary, ...extras] = context.integrations;
  return [
    ...(needsGlobalTool ? [commands.installGlobalTool(context)] : []),
    commands.initProject(context, primary),
    ...extras.map((key) => commands.addIntegration(context, key)),
  ];
}
