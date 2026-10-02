import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { wantsHelp } from '../../src/cli/help/wants.help.ts';

describe('wantsHelp', () => {
  it('detects --help and -h in any position', () => {
    assert.equal(wantsHelp(['add', '--help']), true);
    assert.equal(wantsHelp(['-h']), true);
    assert.equal(wantsHelp(['add', 'foo', '--help']), true);
  });

  it('ignores everything else', () => {
    assert.equal(wantsHelp(['add', 'foo']), false);
    assert.equal(wantsHelp(['add', '--helper']), false);
    assert.equal(wantsHelp([]), false);
  });
});
