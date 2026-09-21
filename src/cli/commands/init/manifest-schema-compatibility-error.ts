/**
 * Thrown when an existing manifest's `maiaVersion` is not satisfied by the
 * schema range the running CLI supports (FR-012). Carries both versions so
 * callers can report an explicit, actionable message instead of silently
 * merging unknown fields into the defaults.
 */
export class ManifestSchemaCompatibilityError extends Error {
  readonly manifestVersion: string;
  readonly supportedRange: string;

  /** Builds the error message from the manifest's version and the CLI's supported range. */
  constructor(manifestVersion: string, supportedRange: string) {
    super(
      `Manifest schema version "${manifestVersion}" is incompatible with the schema range `
      + `this CLI supports ("${supportedRange}"). Migrate the manifest or use a compatible `
      + 'maia CLI version.',
    );
    this.name = 'ManifestSchemaCompatibilityError';
    this.manifestVersion = manifestVersion;
    this.supportedRange = supportedRange;
  }
}
