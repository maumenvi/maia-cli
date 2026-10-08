import path from 'node:path';

import type { ClineGlobalEntry } from './cline.global.entry.contract.ts';

/** Builds the Cline global registration for one project and selected agent. */
export function createClineGlobalEntry(projectRoot: string, agentId: string): ClineGlobalEntry {
  return {
    command: 'maia',
    args: ['mcp-server', '--agent', agentId],
    env: { MAIA_PROJECT_DIR: path.resolve(projectRoot) },
  };
}
