import { dependencySectionForKind } from '../../shared/sections.ts';
import type { CatalogKind } from '../../types/kinds.ts';
import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';

/** Performs the remove manifest dependency operation. */
export function removeManifestDependency(manifest: SourcesManifest, kind: CatalogKind, name: string): SourcesManifest {
  const section = dependencySectionForKind(kind);
  delete manifest[section][name];
  return manifest;
}
