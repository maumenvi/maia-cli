import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';

/** Defines the codex value. */
export const codex: AgentTarget = {
  id: 'codex',
  aliases: ['openai-codex', 'gpt-codex'],
  name: 'OpenAI Codex',
  configFormat: 'toml-mcp-servers',
  configPaths(cwd) {
    return [join(cwd, '.codex', 'config.toml')];
  },
  projectDir: 'omit',
  registrationNote: 'Codex applies .codex/config.toml only in trusted projects: trust this project when Codex asks.',
  instructionsFile(cwd) {
    return join(cwd, 'AGENTS.md');
  },
};
