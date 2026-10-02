import type { CatalogSearchResult } from '../../agent/catalog/providers/contracts/catalog.search.result.ts';
import type { ConfirmFn } from '../commands/toolkit/confirm.fn.ts';
import type { CatalogSelectOptions } from './catalog.select.options.ts';

/** Terminal interactions the CLI needs, injectable so tests never touch a real TTY. */
export interface CliInteraction {
  /** Whether the user can be prompted. */
  isInteractive(): boolean;
  /** Lets the user pick one catalog result; null when cancelled. */
  select(results: CatalogSearchResult[], options?: CatalogSelectOptions): Promise<CatalogSearchResult | null>;
  /** Asks a yes/no question. */
  confirm: ConfirmFn;
}
