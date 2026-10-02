import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';

/** Defines the continue agent value. */
export const continueAgent: AgentTarget = {
  id: 'continue',
  aliases: ['continue-dev'],
  name: 'Continue',
  configFormat: 'mcp-servers',
  configPaths(cwd) {
    return [join(cwd, '.continue', 'config.json')];
  },
  projectDir: 'omit',
  instructionsFile(cwd) {
    return join(cwd, 'AGENTS.md');
  },
};
