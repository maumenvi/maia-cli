import path from 'node:path';

/**
 * Locates Maia's own package.json from the directory of the calling module.
 *
 * Covers both layouts: `src/shared/package/` (running from source) and
 * `dist/src/shared/package/` (published build). Pure: the existence check is
 * injected so the lookup can be tested without touching the filesystem.
 */
export function resolveMaiaPackageJsonPath(here: string, exists: (candidate: string) => boolean): string {
  const candidates = [
    path.resolve(here, '../../../package.json'),
    path.resolve(here, '../../../../package.json'),
  ];

  const packageJsonPath = candidates.find((candidate) => exists(candidate));
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }

  return packageJsonPath;
}
