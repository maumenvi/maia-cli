import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { initCommand } from '../../src/cli/commands/init/init.command.ts';

const LEGACY = path.join('.claude', 'claude_desktop_config.json');

/** Runs `maia init claude` in a fresh folder prepared by `setup`, capturing output. */
async function initClaude(setup: (dir: string) => void = () => {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-claude-config-'));
  const originalCwd = process.cwd();
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
  try {
    setup(dir);
    process.chdir(dir);
    let error: Error | undefined;
    try {
      await initCommand(['claude'], { store: new AgentCatalogStore({ cwd: dir }) });
    } catch (caught) {
      error = caught as Error;
    }
    const read = (file: string) => (existsSync(path.join(dir, file)) ? readFileSync(path.join(dir, file), 'utf8') : undefined);
    return { dir, output, error, read };
  } finally {
    console.log = originalLog;
    process.chdir(originalCwd);
  }
}

describe('Claude Code registration (.mcp.json)', () => {
  it('creates .mcp.json with the proxy and no machine path', async () => {
    const { dir, output, read } = await initClaude();
    try {
      const config = JSON.parse(read('.mcp.json') ?? '{}');
      assert.deepEqual(config.mcpServers.maia, { command: 'maia', args: ['mcp-server', '--agent', 'claude'] });
      assert.equal(existsSync(path.join(dir, LEGACY)), false);
      assert.ok(output.some((line) => line.includes('approve "maia"')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('moves the proxy out of the legacy file and keeps its other entries', async () => {
    const { dir, output, read } = await initClaude((target) => {
      mkdirSync(path.join(target, '.claude'));
      writeFileSync(path.join(target, LEGACY), JSON.stringify({
        mcpServers: { maia: { command: 'maia', args: ['mcp-server'], cwd: '/old' }, other: { command: 'o' } },
      }));
    });
    try {
      assert.deepEqual(Object.keys(JSON.parse(read(LEGACY) ?? '{}').mcpServers), ['other']);
      assert.ok(JSON.parse(read('.mcp.json') ?? '{}').mcpServers.maia);
      assert.ok(output.some((line) => line.startsWith('Moved the "maia" proxy from .claude/claude_desktop_config.json to .mcp.json')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves other servers already in .mcp.json', async () => {
    const { dir, read } = await initClaude((target) => {
      writeFileSync(path.join(target, '.mcp.json'), JSON.stringify({ mcpServers: { mine: { command: 'mine' } } }));
    });
    try {
      assert.deepEqual(Object.keys(JSON.parse(read('.mcp.json') ?? '{}').mcpServers).sort(), ['maia', 'mine']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite an invalid .mcp.json', async () => {
    const { dir, error, read } = await initClaude((target) => {
      writeFileSync(path.join(target, '.mcp.json'), '{');
    });
    try {
      assert.match(error?.message ?? '', /Cannot update .*\.mcp\.json: invalid JSON .*run "maia i"/);
      assert.equal(read('.mcp.json'), '{');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
