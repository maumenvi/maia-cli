import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Performs the write json operation. */
export function writeJson(filePath: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
