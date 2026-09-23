import { ENV_PLACEHOLDER } from './env.placeholder.ts';

/** Performs the extract env names operation. */
export function extractEnvNames(value: string): string[] {
  const names = new Set<string>();
  for (const match of value.matchAll(ENV_PLACEHOLDER)) {
    const name = match[2] ?? match[3];
    if (name) {
      names.add(name.trim());
    }
  }
  return Array.from(names);
}
