import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { mcpEntry } from './mcp.entry.ts';

/** Defines the copilot value. */
export const copilot: AgentTarget = {
  id: 'copilot',
  aliases: ['vscode', 'code'],
  name: 'VS Code Copilot',
  configFormat: 'servers',
  configPaths(cwd) {
    return [join(cwd, '.vscode', 'mcp.json')];
  },
  buildEntry: mcpEntry,
  skillsDir(cwd) {
    return join(cwd, '.github', 'skills');
  },
  instructionsFile(cwd) {
    return join(cwd, '.github', 'copilot-instructions.md');
  },
};
