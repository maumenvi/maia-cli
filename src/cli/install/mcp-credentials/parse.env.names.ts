import { ENV_PLACEHOLDER } from './env.placeholder.ts';

/** Performs the parse env names operation. */
export function parseEnvNames(value: string): string[] {
  const names = new Set<string>();
  for (const match of value.matchAll(ENV_PLACEHOLDER)) {
    const envName = match[2] ?? match[3];
    if (envName) {
      names.add(envName.trim());
    }
  }
  return Array.from(names);
}
