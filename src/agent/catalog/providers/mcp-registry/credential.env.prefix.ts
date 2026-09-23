import { toEnvVariableName } from './to.env.variable.name.ts';

/** Performs the credential env prefix operation. */
export function credentialEnvPrefix(serverName: string): string {
  const tail = serverName.split('/').filter(Boolean).pop() ?? serverName;
  return toEnvVariableName(tail || 'MCP');
}
