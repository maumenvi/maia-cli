import path from 'node:path';

import type { AppConfig } from './app.config.ts';
import { rootDir } from './root.dir.ts';

/** Defines the config value. */
export const config: AppConfig = {
  catalog: {
    skillsRegistryUrl: 'https://skills.sh',
    mcpRegistryUrl: 'https://registry.modelcontextprotocol.io'
  },
  paths: {
    rootDir,
    skillsRoot: path.resolve(rootDir, 'data', 'skills'),
    toolsRoot: path.resolve(rootDir, 'data', 'tools'),
    mcpRoot: path.resolve(rootDir, 'data', 'mcp'),
  },
};
