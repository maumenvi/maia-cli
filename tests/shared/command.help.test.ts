import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { commandHandlers } from '../../src/cli/commands/command.handlers.ts';
import { helpCommand } from '../../src/cli/commands/help.ts';
import { COMMAND_HELP } from '../../src/cli/help/command.help.ts';

describe('COMMAND_HELP', () => {
  it('covers every command the CLI accepts', () => {
    for (const command of Object.keys(commandHandlers)) {
      if (command === 'help') continue;
      assert.ok(COMMAND_HELP[command]?.length, `missing help for "${command}"`);
    }
  });

  it('documents the new install flags', () => {
    assert.ok(COMMAND_HELP.skills.some((line) => line.includes('skills add') && line.includes('--as <name>')));
    assert.ok(COMMAND_HELP.mcp.some((line) => line.includes('mcp i|add|install') && line.includes('--env-g')));
  });

  it('prints every line once, keeping the original order', async () => {
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
    try {
      await helpCommand([], { store: {} as never });
    } finally {
      console.log = originalLog;
    }
    const lines = output.join('\n').split('\n');
    assert.equal(new Set(lines).size, lines.length);
    assert.equal(lines[0], 'maia agent add <name...>');
    assert.ok(lines.indexOf('maia init [agent...]') < lines.indexOf('maia lock'));
    assert.ok(lines.indexOf('maia lock') < lines.indexOf('maia ci'));
    assert.equal(lines.at(-1), 'maia version');
  });
});
