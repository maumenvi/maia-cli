import { createInterface } from 'node:readline/promises';

import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { extractCredentialEnvHints } from './extract.credential.env.hints.ts';
import { formatCredentialSources } from './format.credential.sources.ts';
import { formatInstalls } from './format.installs.ts';

/** Performs the select catalog result operation. */
export async function selectCatalogResult(results: CatalogSearchResult[]): Promise<CatalogSearchResult | null> {
  if (results.length === 0) {
    return null;
  }

  console.log('Available results:\n');
  results.forEach((result, index) => {
    console.log(`${index + 1}) ${result.displayName} (${result.source})${formatInstalls(result.installs)}`);
    if (result.description) {
      console.log(`   ${result.description}`);
    }
    const credentials = extractCredentialEnvHints(result);
    if (credentials.length > 0) {
      console.log(`   Requires credentials: ${credentials.join(', ')}`);
      const sources = formatCredentialSources(result);
      if (sources.length > 0) {
        console.log(`   Where to obtain: ${sources.join(' | ')}`);
      }
    }
  });

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = await input.question(`\nChoose an option (1-${results.length}, 0 to cancel): `);
      const choice = Number(answer.trim());
      if (choice === 0) {
        return null;
      }
      if (Number.isInteger(choice) && choice >= 1 && choice <= results.length) {
        return results[choice - 1];
      }
      console.log(`Invalid option. Enter a number between 1 and ${results.length}.`);
    }
  } finally {
    input.close();
  }
}
