import { join } from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';
import type { LegacyProxyLocation } from '../contracts/legacy.proxy.location.ts';

/** Defines the cursor value. */
export const cursor: AgentTarget = {
  id: 'cursor',
  aliases: ['cursor-ide'],
  name: 'Cursor',
  configFormat: 'mcp-servers',
  configPaths(cwd) {
    return [join(cwd, '.cursor', 'mcp.json')];
  },
  legacyProxyLocations(cwd): LegacyProxyLocation[] {
    return [{ path: join(cwd, '.cursor', 'mcp.json'), format: 'servers' }];
  },
  projectDir: 'workspace-env',
  stdioType: true,
  instructionsFile(cwd) {
    return join(cwd, '.cursor', 'rules', 'maia.mdc');
  },
};
