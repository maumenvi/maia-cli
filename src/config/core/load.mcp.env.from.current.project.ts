import { existsSync } from 'node:fs';
import path from 'node:path';

import { loadDotEnvFromFile } from './load.dot.env.from.file.ts';

/** Loads only Maia's MCP environment without touching the project's `.env`. */
export function loadMcpEnvFromCurrentProject(): void {
  const mcpEnv = path.resolve(process.cwd(), '.maia', 'mcp.env');
  if (existsSync(mcpEnv)) {
    loadDotEnvFromFile(mcpEnv);
  }
}
