import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';

/** Defines the cursor value. */
export const cursor: AgentTarget = {
  id: 'cursor',
  aliases: ['cursor-ide'],
  name: 'Cursor',
  configFormat: 'servers',
  configPaths(cwd) {
    return [join(cwd, '.cursor', 'mcp.json')];
  },
  projectDir: 'workspace-variable',
  instructionsFile(cwd) {
    return join(cwd, '.cursor', 'rules', 'maia.mdc');
  },
};
