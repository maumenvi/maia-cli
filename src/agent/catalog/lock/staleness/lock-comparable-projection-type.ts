import type { LockPackage } from '../../types/lock/lock-package.ts';
import type { SourceLock } from '../../types/lock/source-lock.ts';

/**
 * The part of a lockfile that the manifest alone determines — everything
 * except the two disk-dependent fields (`artifactHash` and `integrity`).
 */
export type LockComparableProjection = {
  name: string;
  sources: SourceLock['sources'];
  packages: Record<string, Omit<LockPackage, 'artifactHash' | 'integrity'>>;
};
