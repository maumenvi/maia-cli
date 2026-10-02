import type { LockPackage } from '../../types/lock/lock.package.ts';
import type { LockToolkit } from '../../types/lock/lock.toolkit.ts';
import type { SourceLock } from '../../types/lock/source.lock.ts';

/**
 * The part of a lockfile that the manifest alone determines — everything
 * except the disk-dependent fields (`artifactHash`, `integrity`, `files`).
 */
export type LockComparableProjection = {
  name: string;
  sources: SourceLock['sources'];
  packages: Record<string, Omit<LockPackage, 'artifactHash' | 'integrity' | 'files'>>;
  toolkits: Record<string, LockToolkit>;
};
