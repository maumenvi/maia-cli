import { credentialEnvName } from './credential.env.name.ts';
import { isCredentialInput } from './is.credential.input.ts';
import type { RegistryInput } from './registry.input.ts';
import { toEnvVariableName } from './to.env.variable.name.ts';

/** Performs the normalize placeholder value operation. */
export function normalizePlaceholderValue(value: string, serverName: string, inputName?: string): string {
  if (!value) {
    return value;
  }

  const directPattern = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
  if (directPattern.test(value)) {
    return value;
  }

  const barePattern = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const credentialEnv = inputName && isCredentialInput({ name: inputName } as RegistryInput)
    ? credentialEnvName(serverName, inputName)
    : undefined;
  const defaultEnvName = credentialEnv ?? toEnvVariableName(inputName ?? 'VALUE');

  return value.replace(barePattern, (_, placeholder: string) => {
    const name = credentialEnv ?? credentialEnvName(serverName, placeholder);
    return '${env:' + (name || defaultEnvName) + '}';
  });
}
