import { SAFE_INHERITED_ENV_KEYS } from './safe.inherited.env.keys.ts';

/** Performs the resolve safe inherited env operation. */
export function resolveSafeInheritedEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of SAFE_INHERITED_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}
