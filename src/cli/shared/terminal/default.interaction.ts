import { promptConfirm } from '../../commands/toolkit/prompt.confirm.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { selectCatalogResult } from '../select/select.catalog.result.ts';
import { isInteractiveTerminal } from './is.interactive.terminal.ts';

/** Real-terminal interaction used when a command receives none. */
export const DEFAULT_INTERACTION: CliInteraction = {
  isInteractive: () => isInteractiveTerminal(),
  select: (results, options) => selectCatalogResult(results, options),
  confirm: promptConfirm,
};
