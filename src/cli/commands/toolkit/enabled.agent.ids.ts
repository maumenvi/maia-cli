import type { SourcesManifest } from '../../../agent/catalog/types/manifest/sources.manifest.ts';

/** Lists the manifest's enabled agents, in declaration order. */
export function enabledAgentIds(manifest: SourcesManifest): string[] {
  return Object.keys(manifest.agents ?? {}).filter((id) => manifest.agents[id]?.enabled !== false);
}
