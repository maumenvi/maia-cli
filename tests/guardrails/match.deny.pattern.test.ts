import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchDenyPattern } from '../../src/guardrails/policy/match.deny.pattern.ts';

describe('matchDenyPattern', () => {
  it('matches a file by extension anywhere in the tree', () => {
    assert.equal(matchDenyPattern('.maia/mcp.env', '**/*.env'), true);
    assert.equal(matchDenyPattern('deep/nested/dir/secrets.env', '**/*.env'), true);
  });

  it('matches a directory pattern in any position', () => {
    assert.equal(matchDenyPattern('app/credentials/token.json', '**/credentials/**'), true);
  });

  it('does not match an unrelated path', () => {
    assert.equal(matchDenyPattern('src/cli/index.ts', '**/*.env'), false);
    assert.equal(matchDenyPattern('skills/find-skills.ts', '**/credentials/**'), false);
  });

  it('matches an exact literal path', () => {
    assert.equal(matchDenyPattern('tools/read_file.mjs', 'tools/read_file.mjs'), true);
    assert.equal(matchDenyPattern('tools/other.mjs', 'tools/read_file.mjs'), false);
  });

  it('matches a single-segment wildcard without crossing directories', () => {
    assert.equal(matchDenyPattern('tools/read_file.mjs', 'tools/*.mjs'), true);
    assert.equal(matchDenyPattern('tools/nested/read_file.mjs', 'tools/*.mjs'), false);
  });

  it('matches everything under a prefix with a trailing globstar', () => {
    assert.equal(matchDenyPattern('tools/read_file.mjs', 'tools/**'), true);
    assert.equal(matchDenyPattern('tools/nested/deep.mjs', 'tools/**'), true);
    assert.equal(matchDenyPattern('skills/other.ts', 'tools/**'), false);
  });
});
