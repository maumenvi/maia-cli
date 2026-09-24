import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { SPECKIT_TOOLKIT } from '../../src/agent/toolkits/catalog/speckit.ts';
import { assertToolkitPathsAllowed } from '../../src/cli/commands/toolkit/assert.toolkit.paths.allowed.ts';
import { checkToolkitPrerequisites } from '../../src/cli/commands/toolkit/check.toolkit.prerequisites.ts';
import { detectToolkitState } from '../../src/cli/commands/toolkit/detect.toolkit.state.ts';
import { isAffirmativeAnswer } from '../../src/cli/commands/toolkit/is.affirmative.answer.ts';
import { promptConfirm } from '../../src/cli/commands/toolkit/prompt.confirm.ts';
import { runNativeCommand } from '../../src/cli/commands/toolkit/run.native.command.ts';
import { snapshotToolkitPaths } from '../../src/cli/commands/toolkit/snapshot.toolkit.paths.ts';
import { createFakeToolkitIo } from '../support/fake.toolkit.io.ts';

/** Runs `body` against a fresh directory. */
function withDir(body: (dir: string) => void | Promise<void>): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-io-'));
  return Promise.resolve(body(dir)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

describe('runNativeCommand', () => {
  it('runs argv without a shell and reports a missing executable as 127', () => {
    const result = runNativeCommand(
      { command: process.execPath, args: ['-e', "process.stdout.write('ok')"] },
      { cwd: os.tmpdir(), interactive: false },
    );
    assert.deepEqual([result.status, result.stdout], [0, 'ok']);
    assert.equal(runNativeCommand({ command: 'maia-no-such-binary', args: [] }, { cwd: os.tmpdir(), interactive: false }).status, 127);
  });
});

describe('confirmation', () => {
  it('answers no without a TTY and recognizes yes answers', async () => {
    const original = process.stdin.isTTY;
    process.stdin.isTTY = false as never;
    try {
      assert.equal(await promptConfirm('Proceed?'), false);
    } finally {
      process.stdin.isTTY = original;
    }
    assert.equal(isAffirmativeAnswer('Y'), true);
    assert.equal(isAffirmativeAnswer('sim'), true);
    assert.equal(isAffirmativeAnswer(''), false);
    assert.equal(isAffirmativeAnswer('nope'), false);
  });
});

describe('checkToolkitPrerequisites', () => {
  it('fails with the hint and docs link when uv is missing', () => withDir((dir) => {
    const io = createFakeToolkitIo(dir, { missing: ['uv'] });
    assert.throws(
      () => checkToolkitPrerequisites(SPECKIT_TOOLKIT, dir, io),
      /Missing prerequisite "uv" for speckit\. Install uv: .* See https:\/\/github\.github\.com\/spec-kit/,
    );
    assert.doesNotThrow(() => checkToolkitPrerequisites(SPECKIT_TOOLKIT, dir, createFakeToolkitIo(dir)));
  }));
});

describe('detectToolkitState', () => {
  it('reads the project version file and the global tool version', () => withDir((dir) => {
    const io = createFakeToolkitIo(dir, { globalVersion: '1.0.11' });
    assert.equal(detectToolkitState(SPECKIT_TOOLKIT, { version: '1.0.11', scope: 'project' }, dir, io).state, 'absent');

    mkdirSync(path.join(dir, '.specify'));
    writeFileSync(path.join(dir, '.specify', 'init-options.json'), '{"speckit_version":"1.0.11"}');
    assert.equal(detectToolkitState(SPECKIT_TOOLKIT, { version: '1.0.11', scope: 'global' }, dir, io).state, 'installed');
    assert.equal(detectToolkitState(SPECKIT_TOOLKIT, { version: '1.0.10', scope: 'project' }, dir, io).state, 'mismatch');

    const noTool = createFakeToolkitIo(dir);
    assert.equal(detectToolkitState(SPECKIT_TOOLKIT, { version: '1.0.11', scope: 'global' }, dir, noTool).state, 'global-tool-missing');
    assert.equal(noTool.calls.length, 1);
  }));
});

describe('snapshotToolkitPaths', () => {
  it('expands a trailing wildcard and keeps only existing paths', () => withDir((dir) => {
    mkdirSync(path.join(dir, '.specify'));
    mkdirSync(path.join(dir, '.claude', 'skills', 'speckit-plan'), { recursive: true });
    mkdirSync(path.join(dir, '.claude', 'skills', 'other'), { recursive: true });
    assert.deepEqual(
      [...snapshotToolkitPaths(dir, ['.specify', '.claude/skills/speckit-*', '.cursor/skills/speckit-*'])],
      ['.specify', '.claude/skills/speckit-plan'],
    );
  }));
});

describe('assertToolkitPathsAllowed', () => {
  it('blocks a directory when anything inside it is denied', () => withDir((dir) => {
    const store = new AgentCatalogStore({ cwd: dir });
    mkdirSync(path.join(dir, '.maia'));
    writeFileSync(path.join(dir, '.maia', 'guardrails.json'), JSON.stringify({ version: 1, denyPatterns: ['.specify/memory/**'] }));
    mkdirSync(path.join(dir, '.specify', 'memory'), { recursive: true });
    writeFileSync(path.join(dir, '.specify', 'memory', 'constitution.md'), '# c');
    mkdirSync(path.join(dir, '.claude', 'skills', 'speckit-plan'), { recursive: true });

    assert.deepEqual(
      assertToolkitPathsAllowed(store, ['.specify', '.claude/skills/speckit-plan'], 'file-delete', 'test'),
      { allowed: ['.claude/skills/speckit-plan'], blocked: ['.specify'] },
    );
  }));

  it('rethrows a malformed policy instead of treating it as a partial block', () => withDir((dir) => {
    const store = new AgentCatalogStore({ cwd: dir });
    mkdirSync(path.join(dir, '.maia'));
    writeFileSync(path.join(dir, '.maia', 'guardrails.json'), '{ not json');
    mkdirSync(path.join(dir, '.specify'));
    assert.throws(() => assertToolkitPathsAllowed(store, ['.specify'], 'file-delete', 'test'), (error: { exitCode?: number }) => error.exitCode === 2);
  }));
});
