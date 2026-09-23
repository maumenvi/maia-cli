import { existsSync, readFileSync } from 'node:fs';

/** Performs the read json operation. */
export function readJson(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    throw new Error(`Could not parse existing config at ${filePath}`);
  }
}
