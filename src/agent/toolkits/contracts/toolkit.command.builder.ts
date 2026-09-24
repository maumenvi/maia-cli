import type { ToolkitCommand } from './toolkit.command.ts';
import type { ToolkitInstallContext } from './toolkit.install.context.ts';

/** Builds a toolkit's native commands from data; pure, no I/O. */
export interface ToolkitCommandBuilder {
  /** Installs the toolkit's tool on the machine. */
  installGlobalTool(context: ToolkitInstallContext): ToolkitCommand;
  /** Initializes the toolkit in the current project. */
  initProject(context: ToolkitInstallContext, primaryIntegration?: string): ToolkitCommand;
  /** Adds one more agent integration to an initialized project. */
  addIntegration(context: ToolkitInstallContext, key: string): ToolkitCommand;
  /** Removes one agent integration through the toolkit's own uninstaller. */
  removeIntegration(context: ToolkitInstallContext, key: string): ToolkitCommand;
  /** Prints the globally installed tool's version. */
  globalToolVersion(): ToolkitCommand;
  /** Command the user can run to uninstall the global tool by hand. */
  uninstallGlobalToolHint(): string;
}
