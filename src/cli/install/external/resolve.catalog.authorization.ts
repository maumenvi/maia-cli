import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { decideAllowedLlms } from './decide.allowed.llms.ts';

/** Turns the trust decision into the final agent list, asking the user when needed. */
export async function resolveCatalogAuthorization(
  result: CatalogSearchResult,
  trusted: boolean,
  flags: Record<string, string>,
  interaction: CliInteraction,
): Promise<string[]> {
  const decision = decideAllowedLlms({ trusted, flags, interactive: interaction.isInteractive() });
  if ('allowedLlms' in decision) {
    return decision.allowedLlms;
  }
  const approved = await interaction.confirm(
    `Authorize ${result.kind}:${result.name} from an untrusted source for all configured agents? [y/N]`,
  );
  return approved ? ['*'] : [];
}
