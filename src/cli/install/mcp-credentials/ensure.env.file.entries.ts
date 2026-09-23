import { existsSync, readFileSync } from 'node:fs';
import { parseEnvFile } from './parse.env.file.ts';
import { syncEnvFile } from './sync.env.file.ts';

/** Performs the ensure env file entries operation. */
export function ensureEnvFileEntries(envFile: string, names: Iterable<string>): void {
  const uniqueNames = Array.from(new Set(Array.from(names).filter(Boolean)));
  const existing = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : new Map<string, string>();
  const toPersist: Record<string, string> = {};

  for (const name of uniqueNames) {
    if (Object.prototype.hasOwnProperty.call(process.env, name) || existing.has(name)) {
      continue;
    }
    toPersist[name] = '';
  }

  syncEnvFile(envFile, toPersist, uniqueNames);
}
