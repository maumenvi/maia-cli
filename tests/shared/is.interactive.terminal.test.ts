import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isInteractiveTerminal } from '../../src/cli/shared/terminal/is.interactive.terminal.ts';

describe('isInteractiveTerminal', () => {
  it('is interactive only when stdin and stdout are terminals', () => {
    assert.equal(isInteractiveTerminal({ isTTY: true }, { isTTY: true }), true);
    assert.equal(isInteractiveTerminal({ isTTY: true }, { isTTY: false }), false);
    assert.equal(isInteractiveTerminal({ isTTY: false }, { isTTY: true }), false);
    assert.equal(isInteractiveTerminal({}, {}), false);
  });
});
