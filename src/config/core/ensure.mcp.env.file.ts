import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Creates the isolated MCP environment file with owner-only permissions. */
export function ensureMcpEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    chmodSync(filePath, 0o600);
    return;
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, '\n', { encoding: 'utf8', mode: 0o600 });
}
