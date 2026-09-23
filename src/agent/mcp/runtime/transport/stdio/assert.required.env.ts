import { collectReferencedEnvNames } from './collect.referenced.env.names.ts';

/**
 * Fails before spawn when a declared environment variable does not resolve.
 *
 * Without this, an unresolved placeholder becomes an empty string and the
 * process starts with a blank credential, failing later with a transport error
 * that never names the variable. Every missing name is reported at once, the
 * way feature 004 reports lock problems, and a variable present but empty
 * counts as missing — an empty credential is never intentional.
 *
 * The message names variables only; a resolved value never appears in it.
 */
export function assertRequiredEnv(env: Record<string, string> | undefined): void {
  const missing: string[] = [];

  for (const value of Object.values(env ?? {})) {
    for (const name of collectReferencedEnvNames(value)) {
      const resolved = process.env[name] ?? process.env[name.toUpperCase()] ?? process.env[name.toLowerCase()];
      if ((typeof resolved !== 'string' || resolved.length === 0) && !missing.includes(name)) {
        missing.push(name);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `MCP process cannot start: required environment variable(s) not set: ${missing.join(', ')}`,
    );
  }
}
