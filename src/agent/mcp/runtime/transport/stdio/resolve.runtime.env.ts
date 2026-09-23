import { resolveEnvPlaceholders } from './resolve.env.placeholders.ts';

/** Performs the resolve runtime env operation. */
export function resolveRuntimeEnv(env: Record<string, string> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env ?? {})) {
    result[key] = resolveEnvPlaceholders(value);
  }
  return result;
}
