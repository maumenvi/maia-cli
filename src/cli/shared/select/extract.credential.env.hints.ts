import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { collectCredentialNames } from './collect.credential.names.ts';

/** Performs the extract credential env hints operation. */
export function extractCredentialEnvHints(result: CatalogSearchResult): string[] {
  const fromRegistry = (result.credentials ?? []).map((credential) => credential.envName ?? credential.name);
  if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
    return Array.from(new Set(fromRegistry)).sort();
  }

  const fromEnv = 'env' in result.install.vscode ? collectCredentialNames(result.install.vscode.env) : [];
  const fromHeaders = 'headers' in result.install.vscode ? collectCredentialNames(result.install.vscode.headers) : [];
  return Array.from(new Set([...fromRegistry, ...fromEnv, ...fromHeaders])).sort();
}
