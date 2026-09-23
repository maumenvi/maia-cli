




/** Performs the versioned package operation. */
export function versionedPackage(identifier: string, version?: string): string {
  return version ? `${identifier}@${version}` : identifier;
}
