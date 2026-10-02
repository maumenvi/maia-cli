import { MAIA_PACKAGE_METADATA } from '../../../../shared/package.metadata.ts';
import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';
import { STALE_LOCAL_SOURCE_REF } from './stale.local.source.ref.ts';

/** Returns whether the Maia-owned `local` source still pins the unpublished 1.5.2 ref. */
export function hasStaleLocalSourceRef(manifest: SourcesManifest): boolean {
  const local = manifest.sources.local;
  return local !== undefined
    && local.type === 'registry'
    && local.url === MAIA_PACKAGE_METADATA.source
    && local.ref === STALE_LOCAL_SOURCE_REF;
}
