import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidGitSourceUrl } from '../../src/agent/catalog/source/is.valid.git.source.url.ts';

describe('isValidGitSourceUrl', () => {
  it('rejects empty or whitespace-only strings', () => {
    assert.equal(isValidGitSourceUrl(''), false);
    assert.equal(isValidGitSourceUrl('   '), false);
  });

  it('accepts URLs with a recognized Git protocol prefix', () => {
    assert.equal(isValidGitSourceUrl('https://github.com/org/repo'), true);
    assert.equal(isValidGitSourceUrl('git@github.com:org/repo.git'), true);
    assert.equal(isValidGitSourceUrl('ssh://git@github.com/org/repo'), true);
    assert.equal(isValidGitSourceUrl('git://github.com/org/repo'), true);
  });

  it('accepts URLs ending in .git', () => {
    assert.equal(isValidGitSourceUrl('https://example.com/org/repo.git'), true);
  });

  it('rejects a string without a recognized protocol or .git suffix', () => {
    assert.equal(isValidGitSourceUrl('not-a-url'), false);
    assert.equal(isValidGitSourceUrl('ftp://example.com/repo'), false);
  });
});
