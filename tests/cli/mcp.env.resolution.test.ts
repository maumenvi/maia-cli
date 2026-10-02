import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { findProjectRoot } from '../../src/config/core/find.project.root.ts';
import { loadMcpEnvFromCurrentProject } from '../../src/config/core/load.mcp.env.from.current.project.ts';

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

describe('loadMcpEnvFromCurrentProject layers (FR-018)', () => {
  /** Runs the loader with a project env and a global env, returning X_TOKEN. */
  function load(projectEnv: string | null, globalEnv: string | { directory: true }): { value: string | undefined; warnings: string[] } {
    const root = mkdtempSync(path.join(os.tmpdir(), 'maia-env-layers-'));
    const configHome = mkdtempSync(path.join(os.tmpdir(), 'maia-env-global-'));
    const previous = { token: process.env.X_TOKEN, home: process.env.MAIA_CONFIG_HOME, claude: process.env.CLAUDE_PROJECT_DIR };
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
    try {
      writeFileSync(path.join(root, 'maia.json'), '{}');
      mkdirSync(path.join(root, '.maia'), { recursive: true });
      if (projectEnv !== null) writeFileSync(path.join(root, '.maia', 'mcp.env'), projectEnv);
      if (typeof globalEnv === 'string') writeFileSync(path.join(configHome, 'mcp.env'), globalEnv);
      else mkdirSync(path.join(configHome, 'mcp.env'));
      delete process.env.X_TOKEN;
      delete process.env.CLAUDE_PROJECT_DIR;
      process.env.MAIA_CONFIG_HOME = configHome;

      loadMcpEnvFromCurrentProject(root);
      return { value: process.env.X_TOKEN, warnings };
    } finally {
      console.warn = originalWarn;
      for (const [key, value] of [['X_TOKEN', previous.token], ['MAIA_CONFIG_HOME', previous.home], ['CLAUDE_PROJECT_DIR', previous.claude]] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(root, { recursive: true, force: true });
      rmSync(configHome, { recursive: true, force: true });
    }
  }

  it('uses the global value when the project entry is empty', () => {
    assert.equal(load('X_TOKEN=\n', 'X_TOKEN=g\n').value, 'g');
  });

  it('prefers a non-empty project value', () => {
    assert.equal(load('X_TOKEN=p\n', 'X_TOKEN=g\n').value, 'p');
  });

  it('warns and keeps project values when the global file cannot be read', () => {
    const { value, warnings } = load('X_TOKEN=p\n', { directory: true });
    assert.equal(value, 'p');
    assert.ok(warnings.some((line) => line.includes('cannot read') && line.includes('using project values only')));
  });
});
