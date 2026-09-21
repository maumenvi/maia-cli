import type { LockPackage } from '../../types/lock/lock-package.ts';
import type { CatalogSearchResult } from '../contracts/catalog-search-result.ts';

/**
 * Filters out remote search results that duplicate a capability already
 * installed locally, giving the local entry precedence (FR-008). Identity is
 * the same `(kind, name)` pair `LockPackage`/`getInstalledPackages` already
 * use.
 */
export function excludeLocallyInstalled(
  results: CatalogSearchResult[],
  installed: LockPackage[],
): CatalogSearchResult[] {
  const installedKeys = new Set(installed.map((pkg) => `${pkg.type}:${pkg.name}`));
  return results.filter((result) => !installedKeys.has(`${result.kind}:${result.name}`));
}
