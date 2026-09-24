import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { SPECKIT_TOOLKIT } from '../../src/agent/toolkits/catalog/speckit.ts';
import { createToolkitCommand } from '../../src/cli/commands/toolkit/toolkit.command.ts';
import { createFakeToolkitIo, type FakeToolkitOptions } from '../support/fake.toolkit.io.ts';

const SOURCE = 'git+https://github.com/github/spec-kit.git@v1.0.11';

interface Project {
  dir: string;
  store: AgentCatalogStore;
  io: ReturnType<typeof createFakeToolkitIo>;
  logs: string[];
  run(args: string[]): Promise<void>;
}

/** Runs `body` in a fresh Maia project with captured output and a fake toolkit. */
async function withProject(
  body: (project: Project) => Promise<void>,
  options: FakeToolkitOptions & { agents?: string[]; catalog?: typeof SPECKIT_TOOLKIT[] } = {},
): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-install-'));
  const originalLog = console.log;
  const originalWarn = console.warn;
  const logs: string[] = [];
  console.log = (...parts: unknown[]) => { logs.push(parts.join(' ')); };
  console.warn = (...parts: unknown[]) => { logs.push(parts.join(' ')); };
  try {
    const store = new AgentCatalogStore({ cwd: dir, toolkitCatalog: options.catalog });
    store.saveManifest(store.loadManifest());
    if (options.agents?.length) store.saveSelectedAgents(options.agents);
    const io = { ...createFakeToolkitIo(dir, options), ...(options.catalog ? { catalog: options.catalog } : {}) };
    const command = createToolkitCommand(io);
    await body({ dir, store, io, logs, run: (args) => command(args, { store }) });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('maia toolkit i', () => {
  it('installs speckit in the project through its native installer and records it', () => withProject(async ({ dir, store, io, logs, run }) => {
    await run(['i', 'speckit', '-y']);

    assert.deepEqual(io.executed(), [
      `uvx --from ${SOURCE} specify init --here --force --non-interactive --ignore-agent-tools --script sh --integration claude`,
      `uvx --from ${SOURCE} specify integration install codex`,
    ]);
    assert.deepEqual(store.loadManifest().toolkits.speckit, { version: '1.0.11', scope: 'project' });
    const lock = store.loadLock();
    assert.equal(lock?.lockfileVersion, 2);
    assert.deepEqual(lock?.toolkits?.speckit?.integrations, ['claude', 'codex']);
    assert.ok(existsSync(path.join(dir, '.specify', 'init-options.json')));
    assert.ok(logs.includes('Installed toolkit:speckit@1.0.11 (project)'));
    assert.ok(logs.some((line) => line.startsWith('Will run: uvx --from')));
    assert.ok(logs.includes('Source: https://github.com/github/spec-kit@v1.0.11'));
    assert.equal(io.questions.length, 0);
    assert.match(
      readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'),
      /- `speckit` 1\.0\.11 \(project\) — docs: https:\/\/github\.github\.com\/spec-kit\/installation\.html; details via the `maia_toolkits` MCP tool/,
    );
  }, { agents: ['claude', 'codex'] }));

  it('treats install as an alias of i', () => withProject(async ({ store, run }) => {
    await run(['install', 'speckit', '-y']);
    assert.equal(store.loadManifest().toolkits.speckit?.version, '1.0.11');
  }));

  it('rejects an unknown toolkit without side effects', () => withProject(async ({ dir, io, run }) => {
    await assert.rejects(run(['i', 'nope']), /Unknown toolkit "nope"\. Available: speckit/);
    assert.equal(io.calls.length, 0);
    assert.equal(existsSync(path.join(dir, 'maia.lock.json')) && JSON.parse(readFileSync(path.join(dir, 'maia.lock.json'), 'utf8')).toolkits, undefined);
  }));

  it('rejects an unknown or malformed version without side effects', () => withProject(async ({ store, io, run }) => {
    await assert.rejects(run(['i', 'speckit', '--version', '9.9.9', '-y']), /Toolkit speckit has no release v9\.9\.9/);
    await assert.rejects(run(['i', 'speckit', '--version', 'abc', '-y']), /Invalid version "abc"/);
    assert.equal(io.calls.length, 0);
    assert.deepEqual(store.loadManifest().toolkits, {});
  }));

  it('installs the requested version', () => withProject(async ({ store, io, run }) => {
    await run(['i', 'speckit', '--version', 'v1.0.10', '-y']);
    assert.ok(io.executed()[0].includes('spec-kit.git@v1.0.10'));
    assert.equal(store.loadManifest().toolkits.speckit?.version, '1.0.10');
  }));

  it('fails on a missing prerequisite before running the installer', () => withProject(async ({ store, io, run }) => {
    await assert.rejects(run(['i', 'speckit', '-y']), /Missing prerequisite "uv" for speckit/);
    assert.equal(io.executed().filter((line) => line.includes('specify')).length, 0);
    assert.deepEqual(store.loadManifest().toolkits, {});
  }, { missing: ['uv'] }));

  it('asks for confirmation and aborts on no', () => withProject(async ({ dir, store, io, run }) => {
    await assert.rejects(run(['i', 'speckit']), /Aborted/);
    assert.deepEqual(io.questions, ['Proceed? [y/N]']);
    assert.equal(existsSync(path.join(dir, '.specify')), false);
    assert.deepEqual(store.loadManifest().toolkits, {});
  }));

  it('proceeds when the user confirms', () => withProject(async ({ store, run }) => {
    await run(['i', 'speckit']);
    assert.equal(store.loadManifest().toolkits.speckit?.scope, 'project');
  }, { confirmAnswer: true }));

  it('removes paths it created when the installer fails and records nothing', () => withProject(async ({ dir, store, run }) => {
    await assert.rejects(run(['i', 'speckit', '-y']), /Toolkit speckit failed to install \(exit 1\)/);
    assert.equal(existsSync(path.join(dir, '.specify')), false);
    assert.equal(existsSync(path.join(dir, '.claude', 'skills', 'speckit-plan')), false);
    assert.deepEqual(store.loadManifest().toolkits, {});
  }, { agents: ['claude'], failOn: (command) => (command.args.includes('init') ? 1 : undefined) }));

  it('keeps pre-existing toolkit paths when the installer fails', () => withProject(async ({ dir, run }) => {
    mkdirSync(path.join(dir, '.specify'));
    writeFileSync(path.join(dir, '.specify', 'mine.md'), 'keep');
    await assert.rejects(run(['i', 'speckit', '-y']), /failed to install/);
    assert.equal(readFileSync(path.join(dir, '.specify', 'mine.md'), 'utf8'), 'keep');
  }, { failOn: (command) => (command.args.includes('init') ? 1 : undefined) }));

  it('does nothing when the same version is already installed and registered', () => withProject(async ({ io, logs, run }) => {
    await run(['i', 'speckit', '-y']);
    const before = io.executed().length;
    await run(['i', 'speckit', '-y']);
    assert.equal(io.executed().length, before);
    assert.ok(logs.includes('speckit@1.0.11 is already installed'));
  }));

  it('adopts an existing unregistered installation without running the installer', () => withProject(async ({ dir, store, io, logs, run }) => {
    mkdirSync(path.join(dir, '.specify'));
    writeFileSync(path.join(dir, '.specify', 'init-options.json'), '{"speckit_version":"1.0.11.dev0"}');
    await run(['i', 'speckit', '-y']);
    assert.deepEqual(io.executed(), []);
    assert.ok(logs.includes('Adopted existing speckit@1.0.11'));
    assert.deepEqual(store.loadManifest().toolkits.speckit, { version: '1.0.11', scope: 'project' });
  }));

  it('switches versions only after the guardrail allows overwriting', () => withProject(async ({ dir, io, logs, run }) => {
    await run(['i', 'speckit', '--version', '1.0.10', '-y']);
    mkdirSync(path.join(dir, '.maia'), { recursive: true });
    writeFileSync(path.join(dir, '.maia', 'guardrails.json'), JSON.stringify({ version: 1, denyPatterns: ['.specify/memory/**'] }));
    writeFileSync(path.join(dir, '.specify', 'memory', 'constitution.md'), '# mine');
    const before = io.executed().length;

    await assert.rejects(run(['i', 'speckit', '--version', '1.0.11', '-y']), /Blocked by guardrail, not overwriting: \.specify/);
    assert.equal(io.executed().length, before);

    rmSync(path.join(dir, '.maia', 'guardrails.json'));
    await run(['i', 'speckit', '--version', '1.0.11', '-y']);
    assert.ok(logs.includes('Existing speckit files will be overwritten (edits will be lost).'));
  }));

  it('warns about unsupported and incompatible agents', () => withProject(async ({ logs, io, run }) => {
    await run(['i', 'speckit', '-y']);
    assert.ok(logs.includes('warning: agent "continue" is not supported by speckit'));
    assert.ok(logs.includes('warning: integration "copilot" cannot be combined with other integrations; skipped'));
    assert.equal(io.executed().length, 1);
  }, { agents: ['claude', 'continue', 'copilot'] }));

  it('warns and uses the default integration without agents', () => withProject(async ({ logs, io, run }) => {
    await run(['i', 'speckit', '-y']);
    assert.ok(logs.includes('warning: no agent configured; speckit installed with its default integration'));
    assert.equal(io.executed()[0].includes('--integration'), false);
  }));

  it('prints usage without a name', () => withProject(async ({ run }) => {
    await assert.rejects(run(['i']), /Usage: maia toolkit i <name>/);
    await assert.rejects(run(['bogus']), /Usage: maia toolkit i\|install\|ls\|rm/);
  }));
});

describe('maia toolkit i -g', () => {
  it('installs the global tool and then initializes the project', () => withProject(async ({ store, io, logs, run }) => {
    await run(['i', 'speckit', '-g', '-y']);
    assert.deepEqual(io.executed(), [
      `uv tool install specify-cli --force --from ${SOURCE}`,
      'specify init --here --force --non-interactive --ignore-agent-tools --script sh --integration claude',
    ]);
    assert.deepEqual(store.loadManifest().toolkits.speckit, { version: '1.0.11', scope: 'global' });
    assert.equal(store.loadLock()?.toolkits?.speckit?.scope, 'global');
    assert.ok(logs.includes('Installed toolkit:speckit@1.0.11 (global)'));
  }, { agents: ['claude'] }));

  it('accepts --global and skips the tool install when it is already at the version', () => withProject(async ({ io, run }) => {
    await run(['i', 'speckit', '--global', '-y']);
    assert.deepEqual(io.executed().map((line) => line.split(' ')[0]), ['specify']);
  }, { globalVersion: '1.0.11' }));

  it('ignores -g with a warning when the toolkit has no global mode', async () => {
    const fake = { ...SPECKIT_TOOLKIT, name: 'fake', supportsGlobal: false };
    await withProject(async ({ store, io, logs, run }) => {
      await run(['i', 'fake', '-g', '-y']);
      assert.ok(logs.includes('warning: fake does not support global installation; installing in the project'));
      assert.ok(io.executed()[0].startsWith('uvx '));
      assert.deepEqual(store.loadManifest().toolkits.fake, { version: '1.0.11', scope: 'project' });
    }, { catalog: [fake] });
  });

  it('reports the global uninstall hint when init fails after the tool was installed', () => withProject(async ({ run }) => {
    await assert.rejects(run(['i', 'speckit', '-g', '-y']), /Global tool kept; to uninstall: uv tool uninstall specify-cli/);
  }, { failOn: (command) => (command.args.includes('init') ? 1 : undefined) }));
});
