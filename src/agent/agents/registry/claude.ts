import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';

/** Defines the claude value. */
export const claude: AgentTarget = {
  id: 'claude',
  name: 'Claude',
  configFormat: 'mcp-servers',
  configPaths(cwd) {
    return [join(cwd, '.mcp.json')];
  },
  legacyConfigPaths(cwd) {
    return [join(cwd, '.claude', 'claude_desktop_config.json')];
  },
  projectDir: 'omit',
  skillsDir(cwd) {
    return join(cwd, '.claude', 'skills');
  },
  instructionsFile(cwd) {
    return join(cwd, 'CLAUDE.md');
  },
};
