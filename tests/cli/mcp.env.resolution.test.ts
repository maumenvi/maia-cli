import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { findProjectRoot } from '../../src/config/core/find.project.root.ts';

function withProject<T>(run: (root: string) => T): T {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-envroot-'));
  // mkdtemp can hand back a symlinked path (/tmp -> /private/tmp); compare real paths.
  const root = path.resolve(tempDir);
  try {
    writeFileSync(path.join(root, 'maia.json'), '{}');
    mkdirSync(path.join(root, '.maia'), { recursive: true });
    return run(root);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('findProjectRoot', () => {
  it('finds the root when starting at the root itself', () => {
    withProject((root) => {
      assert.equal(findProjectRoot(root), root);
    });
  });

  it('finds the root from a nested subdirectory', () => {
    withProject((root) => {
      const deep = path.join(root, 'src', 'deep', 'nested');
      mkdirSync(deep, { recursive: true });

      assert.equal(findProjectRoot(deep), root, 'a subdirectory must still resolve the project root');
    });
  });

  it('returns undefined when no project marker exists above', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-noroot-'));
    try {
      const deep = path.join(tempDir, 'a', 'b');
      mkdirSync(deep, { recursive: true });
      const found = findProjectRoot(deep);
      // Nothing above carries a maia.json, so no root is claimed.
      assert.equal(found, undefined);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('accepts a project marked only by the .maia directory', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-statedir-'));
    const root = path.resolve(tempDir);
    try {
      mkdirSync(path.join(root, '.maia'), { recursive: true });
      const deep = path.join(root, 'x');
      mkdirSync(deep, { recursive: true });

      assert.equal(findProjectRoot(deep), root);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
