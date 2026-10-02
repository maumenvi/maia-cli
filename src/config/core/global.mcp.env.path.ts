import os from 'node:os';
import path from 'node:path';

import { resolveGlobalConfigDir } from './resolve.global.config.dir.ts';

/** Path of the per-user MCP credentials file shared by every project. */
export function globalMcpEnvPath(): string {
  return path.join(resolveGlobalConfigDir(process.env, process.platform, os.homedir()), 'mcp.env');
}
