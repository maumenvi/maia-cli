import { join } from 'node:path';
import os from 'node:os';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { createClineGlobalEntry } from '../global/cline.global.entry.ts';
import { clineEntryKey } from '../global/cline.entry.key.ts';
import { listClineSettingsCandidates } from '../global/cline.settings.candidates.ts';

/** Defines the cline value. */
export const cline: AgentTarget = {
  id: 'cline',
  name: 'Cline',
  configFormat: 'servers',
  configPaths(cwd) {
    return [join(cwd, '.cline', 'mcp.json')];
  },
  legacyProxyLocations(cwd) {
    return [{ path: join(cwd, '.cline', 'mcp.json'), format: 'servers' }];
  },
  projectDir: 'omit',
  globalRegistration: {
    candidates() {
      return listClineSettingsCandidates({
        env: process.env,
        home: os.homedir(),
        platform: process.platform,
      });
    },
    entryKey(projectRoot) {
      return clineEntryKey(projectRoot);
    },
    entry(projectRoot) {
      return createClineGlobalEntry(projectRoot, 'cline');
    },
  },
  instructionsFile(cwd) {
    return join(cwd, '.clinerules', 'maia.md');
  },
};
