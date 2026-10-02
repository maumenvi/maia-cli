import type { SourcesManifest } from '../../../agent/catalog/types/manifest/sources.manifest.ts';

/**
 * A source the user already declared in maia.json keeps the trust they chose;
 * only a new source takes the trust its catalog provider resolved.
 */
export function resolveEffectiveTrust(manifest: SourcesManifest, sourceAlias: string, resolvedTrusted: boolean): boolean {
  const declared = manifest.sources[sourceAlias];
  return declared ? declared.trusted === true : resolvedTrusted;
}
