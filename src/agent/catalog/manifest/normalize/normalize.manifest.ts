import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';
import { createDefaultManifest } from '../defaults.ts';
import type { LegacySourcesManifest } from './legacy.sources.manifest.ts';

/** Performs the normalize manifest operation. */
export const normalizeManifest = (parsed: LegacySourcesManifest): SourcesManifest => ({
  ...createDefaultManifest(),
  ...parsed,
  ...(parsed.aapeVersion && !parsed.maiaVersion ? { maiaVersion: parsed.aapeVersion } : {}),
  config: {
    ...createDefaultManifest().config,
    ...(parsed.config ?? {}),
  },
  registries: {
    ...createDefaultManifest().registries,
    ...(parsed.registries ?? {}),
  },
  sources: { ...(parsed.sources ?? {}) },
  skills: { ...(parsed.skills ?? {}) },
  mcps: { ...(parsed.mcps ?? {}) },
  tools: { ...(parsed.tools ?? {}) },
  agents: { ...(parsed.agents ?? {}) },
});
