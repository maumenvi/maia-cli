import type { CatalogKind } from '../../types/kinds.ts';
import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';

/** Performs the set manifest dependency operation. */
export function setManifestDependency(
  manifest: SourcesManifest,
  kind: CatalogKind,
  name: string,
  dependency: SourcesManifest['skills'][string] | SourcesManifest['mcps'][string] | SourcesManifest['tools'][string],
): SourcesManifest {
  if (kind === 'skill') {
    manifest.skills[name] = dependency as SourcesManifest['skills'][string];
  } else if (kind === 'mcp') {
    manifest.mcps[name] = dependency as SourcesManifest['mcps'][string];
  } else {
    manifest.tools[name] = dependency as SourcesManifest['tools'][string];
  }
  return manifest;
}
