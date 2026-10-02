import { existsSync, readFileSync } from 'node:fs';
import { parseEnvFile } from './parse.env.file.ts';
import { syncEnvFile } from './sync.env.file.ts';

/**
 * Adds an empty placeholder for each missing credential name. Names in
 * `skipNames` (already set globally) get none: an empty project entry would
 * hide the global value from anyone reading the file.
 */
export function ensureEnvFileEntries(envFile: string, names: Iterable<string>, skipNames: ReadonlySet<string> = new Set()): void {
  const uniqueNames = Array.from(new Set(Array.from(names).filter(Boolean)));
  const existing = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : new Map<string, string>();
  const toPersist: Record<string, string> = {};

  for (const name of uniqueNames) {
    if (Object.prototype.hasOwnProperty.call(process.env, name) || existing.has(name) || skipNames.has(name)) {
      continue;
    }
    toPersist[name] = '';
  }

  syncEnvFile(envFile, toPersist, uniqueNames);
}
