import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import type { ToolkitScope } from '../../src/agent/toolkits/contracts/toolkit.scope.ts';
import { createCiCommand } from '../../src/cli/commands/ci.ts';
import { createInstallCommand } from '../../src/cli/commands/install/install.command.ts';
import { createVerifyCommand } from '../../src/cli/commands/verify.ts';
import { createFakeToolkitIo, type FakeToolkitOptions } from '../support/fake.toolkit.io.ts';

interface Project {
  dir: string;
  store: AgentCatalogStore;
  io: ReturnType<typeof createFakeToolkitIo>;
  install(): Promise<void>;
  ci(): Promise<void>;
  verify(): Promise<void>;
}

/** A project that declares speckit in maia.json and maia.lock.json without installing it. */
async function withDeclaredToolkit(
  body: (project: Project) => Promise<void>,
  options: FakeToolkitOptions & { scope?: ToolkitScope } = {},
): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-restore-'));
  const originalLog = console.log;
  console.log = () => {};
  try {
    const store = new AgentCatalogStore({ cwd: dir });
    store.saveManifest(store.loadManifest());
    store.saveSelectedAgents(['claude']);
    store.setToolkit('speckit', { version: '1.0.11', scope: options.scope ?? 'project' });
    store.buildLock();
    const io = createFakeToolkitIo(dir, options);
    await body({
      dir,
      store,
      io,
      install: () => createInstallCommand(io)([], { store }),
      ci: () => createCiCommand(io)([], { store }),
      verify: () => createVerifyCommand(io)([], { store }),
    });
  } finally {
    console.log = originalLog;
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Writes the version file the toolkit would leave behind. */
function writeProjectVersion(dir: string, version: string): void {
  mkdirSync(path.join(dir, '.specify', 'memory'), { recursive: true });
  writeFileSync(path.join(dir, '.specify', 'init-options.json'), JSON.stringify({ speckit_version: version }));
}

describe('maia i with toolkits', () => {
  it('installs a missing toolkit without asking', () => withDeclaredToolkit(async ({ dir, io, install }) => {
    await install();
    assert.equal(io.questions.length, 0);
    assert.ok(io.executed()[0].includes('specify init'));
    assert.ok(existsSync(path.join(dir, '.specify', 'init-options.json')));
  }));

  it('leaves an installed toolkit and its edited files alone', () => withDeclaredToolkit(async ({ dir, io, install }) => {
    await install();
    writeFileSync(path.join(dir, '.specify', 'memory', 'constitution.md'), '# edited');
    const before = io.executed().length;
    await install();
    assert.equal(io.executed().length, before);
    assert.equal(readFileSync(path.join(dir, '.specify', 'memory', 'constitution.md'), 'utf8'), '# edited');
  }));

  it('fails on a version mismatch without running the installer', () => withDeclaredToolkit(async ({ dir, io, install }) => {
    writeProjectVersion(dir, '1.0.10');
    await assert.rejects(
      install(),
      /Toolkit speckit is at 1\.0\.10 but maia\.json requires 1\.0\.11\. Run "maia toolkit i speckit --version 1\.0\.11" to switch versions\./,
    );
    assert.deepEqual(io.executed(), []);
  }));

  it('fails naming the toolkit when the installer fails', () => withDeclaredToolkit(async ({ install }) => {
    await assert.rejects(install(), /Toolkit speckit failed during install: exit 1/);
  }, { failOn: (command) => (command.args.includes('init') ? 1 : undefined) }));

  it('rejects a toolkit that is not in the built-in catalog', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-toolkit-unknown-'));
    try {
      const store = new AgentCatalogStore({ cwd: dir });
      const manifest = store.loadManifest();
      manifest.toolkits = { nope: { version: '1.0.0', scope: 'project' } };
      store.saveManifest(manifest);
      await assert.rejects(createInstallCommand(createFakeToolkitIo(dir))([], { store }), /Unknown toolkit "nope" in maia\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('maia ci with toolkits', () => {
  it('installs the locked version non-interactively', () => withDeclaredToolkit(async ({ io, ci }) => {
    await ci();
    assert.equal(io.questions.length, 0);
    const [init] = io.executed();
    assert.ok(init.includes('spec-kit.git@v1.0.11'));
    assert.ok(init.includes('--non-interactive'));
  }));

  it('does not rerun the installer when already installed', () => withDeclaredToolkit(async ({ io, ci }) => {
    await ci();
    const before = io.executed().length;
    await ci();
    assert.equal(io.executed().length, before);
  }));

  it('fails on a stale lock before running anything', () => withDeclaredToolkit(async ({ store, io, ci }) => {
    store.setToolkit('speckit', { version: '1.0.10', scope: 'project' });
    await assert.rejects(ci(), /out of date with maia\.json/);
    assert.deepEqual(io.executed(), []);
  }));

  it('fails on a version mismatch on disk citing the lockfile', () => withDeclaredToolkit(async ({ dir, io, ci }) => {
    writeProjectVersion(dir, '1.0.10');
    await assert.rejects(ci(), /is at 1\.0\.10 but maia\.lock\.json requires 1\.0\.11/);
    assert.deepEqual(io.executed(), []);
  }));

  it('fails and removes what it created when the installer fails', () => withDeclaredToolkit(async ({ dir, ci }) => {
    await assert.rejects(ci(), /Toolkit speckit failed during ci: exit 1/);
    assert.equal(existsSync(path.join(dir, '.specify')), false);
  }, { failOn: (command) => (command.args.includes('init') ? 1 : undefined) }));
});

describe('maia verify with toolkits', () => {
  it('reports presence and version problems without requiring hashes', () => withDeclaredToolkit(async ({ dir, install, verify }) => {
    await assert.rejects(verify(), /\[toolkit\] toolkit:speckit is not installed/);
    writeProjectVersion(dir, '1.0.10');
    await assert.rejects(verify(), /toolkit:speckit is at 1\.0\.10 but maia\.lock\.json requires 1\.0\.11/);
    rmSync(path.join(dir, '.specify'), { recursive: true, force: true });
    await install();
    await verify();
  }));
});
