import { credentialEnvName } from './credential.env.name.ts';
import { isCredentialInput } from './is.credential.input.ts';
import { normalizePlaceholderValue } from './normalize.placeholder.value.ts';
import type { RegistryInput } from './registry.input.ts';
import { toEnvVariableName } from './to.env.variable.name.ts';

/** Performs the input value operation. */
export function inputValue(serverName: string, input: RegistryInput): string {
  const rawValue = input.value ?? input.default ?? '';
  if (rawValue) {
    return normalizePlaceholderValue(rawValue, serverName, input.name);
  }
  const envName = isCredentialInput(input)
    ? credentialEnvName(serverName, input.name)
    : toEnvVariableName(input.name ?? 'VALUE');
  return '${env:' + envName + '}';
}
