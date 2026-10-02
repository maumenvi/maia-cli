/**
 * Fixed identity of the Maia package. The version is not kept here: it is read
 * from package.json by `readMaiaPackageVersion` so it can never drift.
 */
export const MAIA_PACKAGE_METADATA = {
  name: '@maumenvi/maia-cli',
  source: 'npm:@maumenvi/maia-cli',
} as const;
