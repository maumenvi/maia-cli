import { toRegExpSource } from './to.reg.exp.source.ts';

/**
 * Tests whether a workspace-relative path matches a deny pattern.
 *
 * Matching is pure, so the same path and pattern always yield the same verdict
 * whichever of the four enforcement points asks.
 */
export function matchDenyPattern(targetPath: string, pattern: string): boolean {
  const normalizedPath = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');
  const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  return new RegExp(toRegExpSource(normalizedPattern)).test(normalizedPath);
}
