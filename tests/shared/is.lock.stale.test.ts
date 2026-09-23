import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isLockStale } from '../../src/agent/catalog/lock/staleness/is.lock.stale.ts';
import type { SourceLock } from '../../src/agent/catalog/types/lock/source.lock.ts';
import type { LockPackage } from '../../src/agent/catalog/types/lock/lock.package.ts';

function buildPackage(overrides: Partial<LockPackage> = {}): LockPackage {
  return {
    name: 'demo',
    type: 'skill',
    version: '1.0.0',
    source: 'local',
    resolvedFrom: '*',
    path: 'skills/demo.ts',
    integrity: 'sha256:integrity-placeholder',
    enabled: true,
    capabilities: [],
    constraints: [],
    allowedLlms: ['*'],
    provenance: { repo: 'npm:demo', ref: 'main', trusted: true },
    ...overrides,
  };
}

function buildLock(packages: Record<string, LockPackage>, name = 'proj'): SourceLock {
  return {
    name,
    lockfileVersion: 1,
    sources: { local: { type: 'registry', url: 'npm:demo', ref: '1.0.0', trusted: true, commit: 'abc' } },
    packages,
  };
}

describe('isLockStale', () => {
  it('reports two identical lockfiles as not stale', () => {
    const a = buildLock({ 'skill:demo': buildPackage() });
    const b = buildLock({ 'skill:demo': buildPackage() });

    assert.equal(isLockStale(a, b), false);
  });

  it('ignores artifactHash and integrity differences (the clean CI checkout case)', () => {
    // A committed lockfile carries artifactHash/integrity computed when the
    // artifacts existed on disk. Regenerating it in a clean CI checkout — no
    // artifacts materialized yet — produces neither. Treating that as stale
    // would break every pipeline, so those two fields must be excluded.
    const onDisk = buildLock({
      'skill:demo': buildPackage({ artifactHash: 'sha256:deadbeef', integrity: 'sha256:with-artifact' }),
    });
    const regenerated = buildLock({
      'skill:demo': buildPackage({ artifactHash: undefined, integrity: 'sha256:without-artifact' }),
    });

    assert.equal(isLockStale(onDisk, regenerated), false);
  });

  it('reports a difference in a manifest-derived field as stale', () => {
    const onDisk = buildLock({ 'skill:demo': buildPackage({ version: '1.0.0' }) });
    const regenerated = buildLock({ 'skill:demo': buildPackage({ version: '2.0.0' }) });

    assert.equal(isLockStale(onDisk, regenerated), true);
  });

  it('reports a difference in allowedLlms or path as stale', () => {
    const onDisk = buildLock({ 'skill:demo': buildPackage({ allowedLlms: ['*'] }) });
    const scopedLlms = buildLock({ 'skill:demo': buildPackage({ allowedLlms: ['claude'] }) });
    assert.equal(isLockStale(onDisk, scopedLlms), true);

    const movedPath = buildLock({ 'skill:demo': buildPackage({ path: 'skills/other.ts' }) });
    assert.equal(isLockStale(onDisk, movedPath), true);
  });

  it('reports an added or removed package as stale', () => {
    const onDisk = buildLock({ 'skill:demo': buildPackage() });
    const withExtra = buildLock({
      'skill:demo': buildPackage(),
      'skill:extra': buildPackage({ name: 'extra', path: 'skills/extra.ts' }),
    });

    assert.equal(isLockStale(onDisk, withExtra), true);
  });

  it('reports a different source set as stale', () => {
    const onDisk = buildLock({ 'skill:demo': buildPackage() });
    const withOtherSource: SourceLock = {
      ...buildLock({ 'skill:demo': buildPackage() }),
      sources: { local: { type: 'registry', url: 'npm:demo', ref: '2.0.0', trusted: true, commit: 'xyz' } },
    };

    assert.equal(isLockStale(onDisk, withOtherSource), true);
  });
});
