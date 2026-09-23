import { credentialEnvName } from './credential.env.name.ts';
import { isCredentialInput } from './is.credential.input.ts';
import type { RegistryInput } from './registry.input.ts';

/** Performs the collect credential hints operation. */
export function collectCredentialHints(
  inputs: RegistryInput[] = [],
  serverName = 'MCP',
  sourceUrl?: string,
): Array<{ name: string; envName: string; description?: string; sourceUrl?: string }> {
  return inputs
    .filter((input) => Boolean(input.name) && isCredentialInput(input))
    .map((input) => ({
      name: input.name as string,
      envName: credentialEnvName(serverName, input.name as string),
      description: input.description,
      sourceUrl,
    }));
}
