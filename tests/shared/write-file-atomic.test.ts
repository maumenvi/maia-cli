import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { writeFileAtomic } from '../../src/shared/fs/write-file-atomic.ts';

describe('writeFileAtomic', () => {
  it('writes the exact content to the target path', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-atomic-write-'));
    try {
      const target = path.resolve(tempDir, 'manifest.json');
      writeFileAtomic(target, '{"a":1}\n');
      assert.equal(readFileSync(target, 'utf8'), '{"a":1}\n');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('leaves the original file intact when the write fails', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-atomic-write-fail-'));
    try {
      const target = path.resolve(tempDir, 'manifest.json');
      writeFileSync(target, 'original', 'utf8');

      // Target a path whose parent does not exist so the temp-file write fails,
      // simulating a mid-write failure without touching the real file.
      const missingDirTarget = path.resolve(tempDir, 'missing-subdir', 'manifest.json');
      assert.throws(() => writeFileAtomic(missingDirTarget, 'new content'));

      assert.equal(readFileSync(target, 'utf8'), 'original');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('leaves no stray temp file behind after success or failure', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-atomic-write-cleanup-'));
    try {
      const target = path.resolve(tempDir, 'manifest.json');
      writeFileAtomic(target, 'content');

      const missingDirTarget = path.resolve(tempDir, 'missing-subdir', 'manifest.json');
      assert.throws(() => writeFileAtomic(missingDirTarget, 'content'));

      const entries = readdirSync(tempDir);
      const strayTempFiles = entries.filter((entry) => entry.includes('.tmp'));
      assert.deepEqual(strayTempFiles, []);
      assert.ok(existsSync(target));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
