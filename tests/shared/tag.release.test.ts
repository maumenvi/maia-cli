import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decideTagAction, releaseTagName } from '../../scripts/tag-release.mjs';

const HEAD = '0123456789abcdef0123456789abcdef01234567';
const OTHER = 'fedcba9876543210fedcba9876543210fedcba98';

describe('tag-release', () => {
  it('names the tag after the package version', () => {
    assert.equal(releaseTagName('1.6.2'), 'v1.6.2');
  });

  it('refuses to tag a dirty working tree', () => {
    assert.equal(decideTagAction({ dirty: true, existingSha: '', headSha: HEAD }), 'refuse-dirty');
  });

  it('creates a missing tag', () => {
    assert.equal(decideTagAction({ dirty: false, existingSha: '', headSha: HEAD }), 'create');
  });

  it('accepts a tag that already points to HEAD', () => {
    assert.equal(decideTagAction({ dirty: false, existingSha: HEAD, headSha: HEAD }), 'already-at-head');
  });

  it('refuses to move a tag that points elsewhere', () => {
    assert.equal(decideTagAction({ dirty: false, existingSha: OTHER, headSha: HEAD }), 'refuse-moved');
  });
});
