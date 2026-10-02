import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';

const cliEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/index.ts');
const INITIALIZE = `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`;

/** Starts `maia mcp-server`, sends initialize, closes stdin and returns the result. */
function startServer(cwd: string, env: Record<string, string> = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.CLAUDE_PROJECT_DIR;
  return spawnSync(process.execPath, [cliEntry, 'mcp-server', '--agent', 'claude'], {
    cwd,
    input: INITIALIZE,
    encoding: 'utf8',
    timeout: 20_000,
    env: { ...baseEnv, ...env },
  });
}

/** Creates an initialized Maia project with a subfolder. */
function createProject(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'maia-server-root-'));
  const store = new AgentCatalogStore({ cwd: root });
  store.saveManifest(store.loadManifest());
  mkdirSync(path.join(root, 'sub'));
  return root;
}

describe('maia mcp-server project discovery (FR-004a)', () => {
  it('finds the project from a subfolder', () => {
    const root = createProject();
    try {
      const result = startServer(path.join(root, 'sub'));
      assert.match(result.stdout, /"serverInfo"/, result.stderr);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses CLAUDE_PROJECT_DIR when started outside the project', () => {
    const root = createProject();
    const outside = mkdtempSync(path.join(os.tmpdir(), 'maia-server-outside-'));
    try {
      const result = startServer(outside, { CLAUDE_PROJECT_DIR: root });
      assert.match(result.stdout, /"serverInfo"/, result.stderr);
      assert.equal(existsSync(path.join(outside, '.maia')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('fails clearly outside any project and creates nothing', () => {
    const outside = mkdtempSync(path.join(os.tmpdir(), 'maia-server-none-'));
    try {
      const result = startServer(outside);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /no Maia project found from/);
      assert.equal(existsSync(path.join(outside, '.maia')), false);
      assert.equal(existsSync(path.join(outside, 'maia.json')), false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
