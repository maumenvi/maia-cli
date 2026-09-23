import { isManifestSchemaCompatible } from '../../../agent/catalog/manifest/schema/is.manifest.schema.compatible.ts';
import { ManifestSchemaCompatibilityError } from './manifest.schema.compatibility.error.ts';

/**
 * Throws `ManifestSchemaCompatibilityError` when `manifestVersion` is not
 * satisfied by `supportedRange` (FR-012). A missing `manifestVersion` (e.g.
 * a manifest predating the field) is treated as compatible — there is
 * nothing to reject.
 */
export function assertManifestSchemaCompatible(manifestVersion: string | undefined, supportedRange: string): void {
  if (!manifestVersion) {
    return;
  }
  if (!isManifestSchemaCompatible(manifestVersion, supportedRange)) {
    throw new ManifestSchemaCompatibilityError(manifestVersion, supportedRange);
  }
}
