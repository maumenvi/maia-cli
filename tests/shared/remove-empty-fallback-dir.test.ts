import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { removeEmptyFallbackDir } from '../../src/cli/shared/workspace/remove-empty-fallback-dir.ts';

describe('removeEmptyFallbackDir', () => {
  it('removes the directory when it is empty', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-empty-dir-'));
    try {
      const target = path.resolve(tempDir, 'skills');
      mkdirSync(target);

      removeEmptyFallbackDir(target);

      assert.equal(existsSync(target), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('leaves the directory untouched when it still has entries', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-nonempty-dir-'));
    try {
      const target = path.resolve(tempDir, 'skills');
      mkdirSync(target);
      writeFileSync(path.resolve(target, 'demo.md'), '# demo', 'utf8');

      removeEmptyFallbackDir(target);

      assert.equal(existsSync(target), true);
      assert.equal(existsSync(path.resolve(target, 'demo.md')), true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('treats a missing directory as a no-op', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-missing-dir-'));
    try {
      const target = path.resolve(tempDir, 'does-not-exist');
      assert.doesNotThrow(() => removeEmptyFallbackDir(target));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
