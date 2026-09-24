/**
 * Checks whether a lockfile's declared `lockfileVersion` is the one this CLI
 * supports (FR-010). Pure predicate — no I/O. A lockfile from a different
 * version (older or newer) is incompatible, because its shape is not
 * guaranteed to round-trip through this CLI's verify and restore paths.
 */
export function isLockfileVersionCompatible(lockfileVersion: number, supported: readonly number[]): boolean {
  return supported.includes(lockfileVersion);
}
