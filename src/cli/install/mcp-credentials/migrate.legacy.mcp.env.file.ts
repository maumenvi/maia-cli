import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { parseEnvFile } from './parse.env.file.ts';
import { syncEnvFile } from './sync.env.file.ts';

/** Moves legacy `.env.maia` values into `.maia/mcp.env` without losing existing values. */
export function migrateLegacyMcpEnvFile(projectRoot: string, mcpEnvFile: string): void {
  const legacyFile = path.resolve(projectRoot, '.env.maia');
  if (!existsSync(legacyFile)) return;

  const legacy = parseEnvFile(readFileSync(legacyFile, 'utf8'));
  const current = existsSync(mcpEnvFile)
    ? parseEnvFile(readFileSync(mcpEnvFile, 'utf8'))
    : new Map<string, string>();
  const merged = Object.fromEntries([...legacy, ...current]);
  syncEnvFile(mcpEnvFile, merged, Object.keys(merged));
  rmSync(legacyFile);
}
