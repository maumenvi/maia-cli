import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';
import type { LegacyProxyLocation } from '../contracts/legacy.proxy.location.ts';

/** Defines the continue agent value. */
export const continueAgent: AgentTarget = {
  id: 'continue',
  aliases: ['continue-dev'],
  name: 'Continue',
  configFormat: 'continue-mcp-block',
  configPaths(cwd) {
    return [join(cwd, '.continue', 'mcpServers', 'maia.yaml')];
  },
  legacyProxyLocations(cwd): LegacyProxyLocation[] {
    return [{ path: join(cwd, '.continue', 'config.json'), format: 'mcp-servers' }];
  },
  projectDir: 'omit',
  instructionsFile(cwd) {
    return join(cwd, 'AGENTS.md');
  },
};
