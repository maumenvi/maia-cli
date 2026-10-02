import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { resolveMaiaPackageJsonPath } from '../../src/shared/package/resolve.maia.package.json.path.ts';

const only = (...existing: string[]) => (candidate: string) => existing.includes(candidate);

describe('resolveMaiaPackageJsonPath', () => {
  it('resolves the repository root from the source layout', () => {
    const root = path.resolve('/r');
    assert.equal(
      resolveMaiaPackageJsonPath(path.join(root, 'src/shared/package'), only(path.join(root, 'package.json'))),
      path.join(root, 'package.json'),
    );
  });

  it('resolves the package root from the published dist layout', () => {
    const root = path.resolve('/p');
    assert.equal(
      resolveMaiaPackageJsonPath(path.join(root, 'dist/src/shared/package'), only(path.join(root, 'package.json'))),
      path.join(root, 'package.json'),
    );
  });

  it('prefers the first candidate when both exist', () => {
    const here = path.resolve('/p/dist/src/shared/package');
    const first = path.resolve('/p/dist/package.json');
    const second = path.resolve('/p/package.json');
    assert.equal(resolveMaiaPackageJsonPath(here, only(first, second)), first);
  });

  it('fails clearly when no candidate exists', () => {
    assert.throws(() => resolveMaiaPackageJsonPath(path.resolve('/x/a/b/c'), () => false), /package\.json not found/);
  });
});
