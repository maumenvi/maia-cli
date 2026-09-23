import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { versionCommand } from '../../src/cli/commands/version/version.command.ts';

describe('CLI version', () => {
  it('prints the package version', async () => {
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      output.push(args.join(' '));
    };

    try {
      await versionCommand([], { store: {} as never });
    } finally {
      console.log = originalLog;
    }

    assert.equal(output.length, 1);
    assert.match(output[0], /^\d+\.\d+\.\d+/);
  });
});
