import path from 'node:path';

import { MAIA_PACKAGE_METADATA } from '../../../shared/package.metadata.ts';
import type { SourcesManifest } from '../types/manifest/sources.manifest.ts';

/** Performs the create default manifest operation. */
export const createDefaultManifest = (): SourcesManifest => ({
  name: path.basename(process.cwd()),
  version: '0.1.0',
  maiaVersion: '^1.0.0',
  config: {
    registryStrategy: 'hybrid',
    strictVerify: true,
    llmAccessDefault: 'allow',
  },
  registries: {
    skills: {
      provider: 'skills.sh',
      url: 'https://skills.sh',
    },
    mcp: {
      provider: 'mcp',
      url: 'https://registry.modelcontextprotocol.io',
    },
  },
  sources: {
    local: {
      type: 'registry',
      url: MAIA_PACKAGE_METADATA.source,
      ref: MAIA_PACKAGE_METADATA.version,
      trusted: true,
    },
  },
  skills: {},
  mcps: {},
  tools: {},
  toolkits: {},
  agents: {},
});
