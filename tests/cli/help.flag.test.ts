import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const cliEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/index.ts');

const CASES = [
  ['skills', 'add', '--help'],
  ['skills', 'add', '-h'],
  ['skills', 'find', '--help'],
  ['mcp', 'add', '--help'],
  ['mcp', 'i', '-h'],
  ['toolkit', 'i', '--help'],
  ['i', '--help'],
  ['--help'],
];

describe('--help / -h on any command', () => {
  for (const args of CASES) {
    it(`maia ${args.join(' ')} prints help and touches nothing`, () => {
      const cwd = mkdtempSync(path.join(os.tmpdir(), 'maia-help-'));
      const configHome = mkdtempSync(path.join(os.tmpdir(), 'maia-help-config-'));
      try {
        const result = spawnSync(process.execPath, [cliEntry, ...args], {
          cwd,
          encoding: 'utf8',
          env: { ...process.env, MAIA_CONFIG_HOME: configHome },
        });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /maia /);
        assert.deepEqual(readdirSync(cwd), []);
        assert.deepEqual(readdirSync(configHome), []);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
        rmSync(configHome, { recursive: true, force: true });
      }
    });
  }

  it('prints only the requested command help', () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'maia-help-'));
    try {
      const result = spawnSync(process.execPath, [cliEntry, 'skills', 'add', '--help'], { cwd, encoding: 'utf8' });
      assert.match(result.stdout, /maia skills add/);
      assert.doesNotMatch(result.stdout, /maia toolkit/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
