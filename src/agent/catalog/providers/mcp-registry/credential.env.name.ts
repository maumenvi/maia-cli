import { credentialEnvPrefix } from './credential.env.prefix.ts';
import { toEnvVariableName } from './to.env.variable.name.ts';

/** Performs the credential env name operation. */
export function credentialEnvName(serverName: string, inputName?: string): string {
  return toEnvVariableName(`${credentialEnvPrefix(serverName)}_${inputName ?? 'VALUE'}`);
}
