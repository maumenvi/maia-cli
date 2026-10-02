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
  // Built-in Claude Code slash commands; a skill with one of these names is ambiguous.
  nativeCommands: [
    'add-dir', 'agents', 'bug', 'clear', 'compact', 'config', 'context', 'cost', 'doctor',
    'export', 'help', 'hooks', 'ide', 'init', 'install-github-app', 'login', 'logout', 'mcp',
    'memory', 'model', 'output-style', 'permissions', 'plugin', 'pr-comments', 'release-notes',
    'resume', 'review', 'rewind', 'security-review', 'status', 'statusline', 'terminal-setup',
    'todos', 'upgrade', 'usage', 'vim',
  ],
  skillsDir(cwd) {
    return join(cwd, '.claude', 'skills');
  },
  instructionsFile(cwd) {
    return join(cwd, 'CLAUDE.md');
  },
};
