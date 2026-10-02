import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { ensureGlobalEnvFile } from '../../src/cli/install/mcp-credentials/ensure.global.env.file.ts';

const posix = process.platform !== 'win32';

describe('ensureGlobalEnvFile', () => {
  it('creates the file 0600 inside a 0700 directory', { skip: !posix }, () => {
    const base = mkdtempSync(path.join(os.tmpdir(), 'maia-global-env-'));
    try {
      const file = path.join(base, 'maia', 'mcp.env');
      ensureGlobalEnvFile(file);
      assert.equal(statSync(file).mode & 0o777, 0o600);
      assert.equal(statSync(path.dirname(file)).mode & 0o777, 0o700);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('warns about a world-readable file and leaves it untouched', { skip: !posix }, () => {
    const base = mkdtempSync(path.join(os.tmpdir(), 'maia-global-env-'));
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
    try {
      const file = path.join(base, 'mcp.env');
      writeFileSync(file, 'X=1\n');
      chmodSync(file, 0o644);
      ensureGlobalEnvFile(file);
      assert.equal(statSync(file).mode & 0o777, 0o644);
      assert.ok(warnings.some((line) => line.includes('is readable by other users') && line.includes('chmod 600')));
    } finally {
      console.warn = originalWarn;
      rmSync(base, { recursive: true, force: true });
    }
  });
});
