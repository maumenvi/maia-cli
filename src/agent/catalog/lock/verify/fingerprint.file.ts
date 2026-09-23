import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Performs the fingerprint file operation. */
export function fingerprintFile(filePath: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
}
