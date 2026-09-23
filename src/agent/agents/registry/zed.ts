import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { mcpEntry } from './mcp.entry.ts';

/** Defines the zed value. */
export const zed: AgentTarget = {
  id: 'zed',
  name: 'Zed',
  configFormat: 'zed-settings',
  configPaths(cwd) {
    return [join(cwd, '.zed', 'settings.json')];
  },
  buildEntry: mcpEntry,
  instructionsFile(cwd) {
    return join(cwd, 'AGENTS.md');
  },
};
