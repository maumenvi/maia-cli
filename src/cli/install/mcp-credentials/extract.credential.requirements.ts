import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { CREDENTIAL_NAME } from './credential.name.ts';
import type { CredentialRequirement } from './credential.requirement.ts';
import { mergeUnique } from './merge.unique.ts';
import { parseEnvNames } from './parse.env.names.ts';

/** Performs the extract credential requirements operation. */
export function extractCredentialRequirements(result: CatalogSearchResult): CredentialRequirement[] {
  if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
    return [];
  }

  const fromRegistry = (result.credentials ?? []).map((credential) => ({
    envName: credential.envName ?? credential.name,
    name: credential.name,
    description: credential.description,
    sourceUrl: credential.sourceUrl,
  }));

  const inferred = new Set<string>();
  const envMap = 'env' in result.install.vscode ? result.install.vscode.env : undefined;
  if (envMap) {
    for (const value of Object.values(envMap)) {
      for (const envName of parseEnvNames(value)) {
        if (CREDENTIAL_NAME.test(envName)) {
          inferred.add(envName);
        }
      }
    }
  }

  const headerMap = 'headers' in result.install.vscode ? result.install.vscode.headers : undefined;
  if (headerMap) {
    for (const value of Object.values(headerMap)) {
      for (const envName of parseEnvNames(value)) {
        if (CREDENTIAL_NAME.test(envName)) {
          inferred.add(envName);
        }
      }
    }
  }

  const inferredRequirements = Array.from(inferred).map((name) => ({ envName: name, name }));
  return mergeUnique([...fromRegistry, ...inferredRequirements]);
}
