import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Creates the global credentials file readable only by its owner. An existing
 * file is never changed; if others can read it the user is warned instead.
 */
export function ensureGlobalEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    writeFileSync(filePath, '', { encoding: 'utf8', mode: 0o600 });
    return;
  }
  if (process.platform !== 'win32' && (statSync(filePath).mode & 0o077) !== 0) {
    console.warn(`warning: ${filePath} is readable by other users; run "chmod 600 ${filePath}".`);
  }
}
