import { CREDENTIAL_NAME } from './credential.name.ts';
import { extractEnvNames } from './extract.env.names.ts';

/** Performs the collect credential names operation. */
export function collectCredentialNames(
  map: Record<string, string> | undefined,
): string[] {
  if (!map) {
    return [];
  }

  const names = new Set<string>();
  for (const value of Object.values(map)) {
    for (const envName of extractEnvNames(value)) {
      if (CREDENTIAL_NAME.test(envName)) {
        names.add(envName);
      }
    }
  }
  return Array.from(names);
}
