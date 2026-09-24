import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseFlags } from '../../src/cli/shared/flags/parse.flags.ts';

describe('parseFlags', () => {
  it('maps -g to the global flag without treating it as positional', () => {
    assert.deepEqual(parseFlags(['speckit', '-g']), { positional: ['speckit'], flags: { global: 'true' } });
  });

  it('maps -y to the yes flag', () => {
    assert.equal(parseFlags(['-y']).flags.yes, 'true');
  });

  it('accepts the long forms --global and --yes', () => {
    assert.deepEqual(parseFlags(['--global', '--yes']).flags, { global: 'true', yes: 'true' });
  });

  it('does not let a short flag be consumed as a value', () => {
    assert.deepEqual(parseFlags(['--version', '1.0.11', '-g']).flags, { version: '1.0.11', global: 'true' });
    assert.deepEqual(parseFlags(['--all-llms', '-y']).flags, { 'all-llms': 'true', yes: 'true' });
  });

  it('keeps the existing long-flag behavior', () => {
    assert.deepEqual(parseFlags(['skill', 'x', '--version', '^1']), {
      positional: ['skill', 'x'],
      flags: { version: '^1' },
    });
  });

  it('falls back to the letter for unknown short flags', () => {
    assert.equal(parseFlags(['-z']).flags.z, 'true');
  });
});
