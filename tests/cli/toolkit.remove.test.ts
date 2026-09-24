import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { createToolkitCommand } from '../../src/cli/commands/toolkit/toolkit.command.ts';
import { createFakeToolkitIo, type FakeToolkitOptions } from '../support/fake.toolkit.io.ts';

interface Project {
  dir: string;
  store: AgentCatalogStore;
  io: ReturnType<typeof createFakeToolkitIo>;
  logs: string[];
  run(args: string[]): Promise<void>;
}

/** A project with speckit installed for claude and codex through the fake toolkit. */
async function withInstalled(
  body: (project: Project) => Promise<void>,
  options: FakeToolkitOptions & { global?: boolean } = {},
): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-rm-'));
  const originalLog = console.log;
  const originalWarn = console.warn;
  const logs: string[] = [];
  console.log = (...parts: unknown[]) => { logs.push(parts.join(' ')); };
  console.warn = (...parts: unknown[]) => { logs.push(parts.join(' ')); };
  try {
    const store = new AgentCatalogStore({ cwd: dir });
    store.saveManifest(store.loadManifest());
    store.saveSelectedAgents(['claude', 'codex']);
    const io = createFakeToolkitIo(dir, options);
    const command = createToolkitCommand(io);
    await command(['i', 'speckit', '-y', ...(options.global ? ['-g'] : [])], { store });
    io.calls.length = 0;
    logs.length = 0;
    await body({ dir, store, io, logs, run: (args) => command(args, { store }) });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Writes a guardrail policy denying `patterns`. */
function denyPaths(dir: string, patterns: string[]): void {
  mkdirSync(path.join(dir, '.maia'), { recursive: true });
  writeFileSync(path.join(dir, '.maia', 'guardrails.json'), JSON.stringify({ version: 1, denyPatterns: patterns }));
}

describe('maia toolkit rm', () => {
  it('fails when the toolkit is not registered', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-rm-none-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      await assert.rejects(createToolkitCommand(createFakeToolkitIo(dir))(['rm', 'speckit'], { store }), /Toolkit "speckit" is not installed/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps the files when the user answers no, but drops the entries', () => withInstalled(async ({ dir, store, io, logs, run }) => {
    await run(['rm', 'speckit']);
    assert.deepEqual(io.questions, ['Delete these files? Edits will be lost. [y/N]']);
    assert.ok(existsSync(path.join(dir, '.specify')));
    assert.deepEqual(store.loadManifest().toolkits, {});
    assert.equal(store.loadLock()?.lockfileVersion, 1);
    assert.equal(store.loadLock()?.toolkits, undefined);
    assert.ok(logs.some((line) => line.startsWith('Kept: .specify')));
    assert.deepEqual(io.executed(), []);
  }));

  it('uninstalls each integration natively and deletes the rest on yes', () => withInstalled(async ({ dir, io, run }) => {
    await run(['remove', 'speckit']);
    assert.deepEqual(io.executed().map((line) => line.split(' ').slice(-3).join(' ')), [
      'integration uninstall claude',
      'integration uninstall codex',
    ]);
    assert.equal(existsSync(path.join(dir, '.specify')), false);
    assert.equal(existsSync(path.join(dir, '.claude', 'skills', 'speckit-plan')), false);
  }, { confirmAnswer: true }));

  it('treats -y as explicit confirmation', () => withInstalled(async ({ dir, io, run }) => {
    await run(['rm', 'speckit', '-y']);
    assert.equal(io.questions.length, 0);
    assert.equal(existsSync(path.join(dir, '.specify')), false);
  }));

  it('skips the native uninstall of an integration whose paths are protected', () => withInstalled(async ({ dir, io, logs, run }) => {
    denyPaths(dir, ['.claude/skills/**']);
    await run(['rm', 'speckit', '-y']);
    assert.equal(io.executed().some((line) => line.endsWith('integration uninstall claude')), false);
    assert.ok(io.executed().some((line) => line.endsWith('integration uninstall codex')));
    assert.ok(existsSync(path.join(dir, '.claude', 'skills', 'speckit-plan', 'SKILL.md')));
    assert.ok(logs.includes('Blocked by guardrail, kept: .claude/skills/speckit-plan'));
    assert.equal(existsSync(path.join(dir, '.specify')), false);
  }));

  it('keeps a protected .specify and still succeeds', () => withInstalled(async ({ dir, logs, run }) => {
    denyPaths(dir, ['.specify/**']);
    await run(['rm', 'speckit', '-y']);
    assert.ok(existsSync(path.join(dir, '.specify')));
    assert.ok(logs.includes('Blocked by guardrail, kept: .specify'));
  }));

  it('never uninstalls the global tool', () => withInstalled(async ({ io, logs, run }) => {
    await run(['rm', 'speckit', '-y']);
    assert.ok(logs.includes('Global tool kept. To uninstall: uv tool uninstall specify-cli'));
    assert.equal(io.executed().some((line) => line.startsWith('uv tool uninstall')), false);
    assert.equal(io.state.globalVersion, '1.0.11');
  }, { global: true }));
});
