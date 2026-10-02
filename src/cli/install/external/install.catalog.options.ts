import type { CliInteraction } from '../../contracts/cli.interaction.ts';

/** How a catalog result is installed: the user's flags and how to talk to them. */
export interface InstallCatalogOptions {
  /** Raw CLI flags (`--all-llms`, `--llms`, ...). */
  flags?: Record<string, string>;
  /** Terminal interaction; defaults to the real terminal. */
  interaction?: CliInteraction;
  /** Where requested MCP credentials are written. */
  envScope?: 'project' | 'global';
}
