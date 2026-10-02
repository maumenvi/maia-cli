import { existsSync, readFileSync } from 'node:fs';

/**
 * Reads an agent config file. A file that is not valid JSON is never
 * overwritten: the error names the file so the user can fix it.
 */
export function readJson(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot update ${filePath}: invalid JSON (${reason}). Fix or remove it and run "maia i".`);
  }
}
