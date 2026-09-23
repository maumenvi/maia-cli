import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';

/** Defines the legacy sources manifest type. */
export type LegacySourcesManifest = Partial<SourcesManifest> & {
  aapeVersion?: string;
};
