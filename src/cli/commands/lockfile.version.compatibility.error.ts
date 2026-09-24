/**
 * Thrown when a lockfile's `lockfileVersion` is not the one the running CLI
 * supports (FR-010). Carries both versions so the failure is reported as a
 * schema incompatibility with an actionable message, never as an integrity
 * mismatch — which would wrongly suggest tampering.
 */
export class LockfileVersionCompatibilityError extends Error {
  readonly lockfileVersion: number;
  readonly supportedVersions: readonly number[];

  /** Builds the error message from the lockfile's version and the CLI's supported version. */
  constructor(lockfileVersion: number, supportedVersions: readonly number[]) {
    super(
      `Lockfile version ${lockfileVersion} is incompatible with the version this CLI `
      + `supports (${supportedVersions.join(', ')}). Migrate maia.lock.json or use a compatible `
      + 'maia CLI version.',
    );
    this.name = 'LockfileVersionCompatibilityError';
    this.lockfileVersion = lockfileVersion;
    this.supportedVersions = supportedVersions;
  }
}
