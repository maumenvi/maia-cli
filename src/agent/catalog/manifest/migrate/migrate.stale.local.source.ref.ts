import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';
import { hasStaleLocalSourceRef } from './has.stale.local.source.ref.ts';

/**
 * Returns a manifest whose `local` source ref is the given Maia version when it
 * still pins the unpublished 1.5.2; any other manifest is returned unchanged.
 */
export function migrateStaleLocalSourceRef(manifest: SourcesManifest, version: string): SourcesManifest {
  if (!hasStaleLocalSourceRef(manifest)) return manifest;

  return {
    ...manifest,
    sources: {
      ...manifest.sources,
      local: { ...manifest.sources.local, ref: version },
    },
  };
}
