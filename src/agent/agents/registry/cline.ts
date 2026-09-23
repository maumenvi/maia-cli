import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { mcpEntry } from './mcp.entry.ts';

/** Defines the cline value. */
export const cline: AgentTarget = {
  id: 'cline',
  name: 'Cline',
  configFormat: 'servers',
  configPaths(cwd) {
    return [join(cwd, '.cline', 'mcp.json')];
  },
  buildEntry: mcpEntry,
  instructionsFile(cwd) {
    return join(cwd, '.clinerules', 'maia.md');
  },
};
