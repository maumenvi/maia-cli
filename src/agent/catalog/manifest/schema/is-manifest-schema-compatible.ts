import { parseVersion } from './parse-version.ts';

/**
 * Checks whether a manifest's declared `maiaVersion` is compatible with the
 * schema range the running CLI supports. Both arguments are simple
 * `^major.minor.patch`-style ranges; compatibility here means "same major
 * version" — i.e. the same caret-range semantics `^x.y.z` carries in
 * semver: only the major version is treated as a compatibility boundary.
 *
 * Pure predicate — no I/O. Returns `false` (rather than throwing) when
 * either version string cannot be parsed, so callers can decide how to
 * report an unparseable version.
 */
export function isManifestSchemaCompatible(manifestVersion: string, supportedRange: string): boolean {
  const manifest = parseVersion(manifestVersion);
  const supported = parseVersion(supportedRange);
  if (!manifest || !supported) {
    return false;
  }
  return manifest.major === supported.major;
}
