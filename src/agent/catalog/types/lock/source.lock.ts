import type { CatalogSource } from '../source/catalog.source.ts';
import type { LockPackage } from './lock.package.ts';
import type { LockToolkit } from './lock.toolkit.ts';

/**
 * Describes the source lock contract. Deliberately carries no generation
 * timestamp: the lockfile is versioned, so any field that changes between
 * runs without the installed content changing would produce spurious diffs
 * and make the lockfile non-deterministic (FR-001).
 */
export interface SourceLock {
  name: string;
  lockfileVersion: number;
  sources: Record<string, CatalogSource & { commit: string; commitResolved?: boolean }>;
  packages: Record<string, LockPackage>;
  /** Present only when the manifest declares toolkits; its presence bumps `lockfileVersion` to 2. */
  toolkits?: Record<string, LockToolkit>;
}
