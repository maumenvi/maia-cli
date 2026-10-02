import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decideAllowedLlms } from '../../src/cli/install/external/decide.allowed.llms.ts';

describe('decideAllowedLlms', () => {
  it('honours --all-llms and --llms for any source', () => {
    assert.deepEqual(decideAllowedLlms({ trusted: false, flags: { 'all-llms': 'true' }, interactive: false }), { allowedLlms: ['*'] });
    assert.deepEqual(decideAllowedLlms({ trusted: false, flags: { llms: 'claude, codex' }, interactive: false }), { allowedLlms: ['claude', 'codex'] });
  });

  it('authorizes every agent for a trusted source', () => {
    assert.deepEqual(decideAllowedLlms({ trusted: true, flags: {}, interactive: false }), { allowedLlms: ['*'] });
  });

  it('asks on a terminal for an untrusted source', () => {
    assert.deepEqual(decideAllowedLlms({ trusted: false, flags: {}, interactive: true }), { ask: true });
  });

  it('authorizes nobody for an untrusted source without a terminal', () => {
    assert.deepEqual(decideAllowedLlms({ trusted: false, flags: {}, interactive: false }), { allowedLlms: [] });
  });
});
